#!/usr/bin/env perl
use strict;
use warnings;
use FindBin qw($Bin);
use lib ( -d "$Bin/../lib/perl5" ? "$Bin/../lib/perl5" : "$Bin/../lib" );
use Carp;
use DateTime;
use DateTime::TimeZone;
use Getopt::Long;
use List::MoreUtils qw(uniq);
use Log::Log4perl;
use Log::Log4perl::Level;
use MongoDB;
use JSON;

use WTSI::DNAP::Utilities::LDAP;
use npg_warehouse::Schema;

our $VERSION = '0';

my $embedded_conf = << 'LOGCONF';
   log4perl.logger.npg.acls = ERROR, A1

   log4perl.appender.A1           = Log::Log4perl::Appender::Screen
   log4perl.appender.A1.utf8      = 1
   log4perl.appender.A1.layout    = Log::Log4perl::Layout::PatternLayout
   log4perl.appender.A1.layout.ConversionPattern = %d %p %m %n
LOGCONF

my $what_on_earth =<<'WOE';

Script to generate mappings between Sequencescape studies and
Sanger users (or vice versa).

Requires ability to contact the Sanger LDAP server and the
Sequencescape warehouse database, and to get valid output from
running `igroupadmin lg dnap_ro`.

The Sequencescape warehouse database is used to find the set of
studies. An access group is created for each study with name matching
the study id.

A "public" group is formed from the union of the member lists of all
unix groups.

If a Sequencescape study has an entry for the "data_access_group" then
the intersection of the members of the corresponding WTSI unix group
and public group is used as the membership of the corresponding group.

If no data_access_group is set on the study, then if the study is
associated with sequencing the members of the access group will be set
to the public group, else if the study is not associated with
sequencing the access group will be left empty (except for members of
the dnap_ro iRODS group).

Options:

  --ca-file     Path to file with CA to be used if connecting through ssl. If
                external CA is needed, don't pass ssl=true as part of db-url
  --db-name     Name and collection to compare old data. No effect unless
                --db-url is set. [sentry.users]
  --db-url      URL of mongo database to compare lists of users. Users that
                no longer appear will be marked as such. No effect unless
                --user-first is set.
  --debug       Enable debug level logging. Optional, defaults to false.
  --eml         Email address to append to usernames
  --help        Display help.
  --logconf     A log4perl configuration file. Optional.
  --study       Restrict updates to a study. May be used multiple times
                to select more than one study. Optional.
                Mutually exclusive with --user-first.
  --user-first  Output users mapped to groups.
                Mutually exclusive with --study.
  --verbose     Print messages while processing. Optional.

WOE

my $ca_file;
my $dbname = 'sentry.users';
my $dburl;
my $debug;
my $eml = q{};
my $log4perl_config;
my $userfirst;
my $verbose;
my @studies;

GetOptions('ca-file=s'               => \$ca_file,
           'db-name=s'               => \$dbname,
           'db-url=s'                => \$dburl,
           'debug'                   => \$debug,
           'eml=s'                   => \$eml,
           'help'                    => sub {
             print $what_on_earth or carp 'Failed to write to stdout';
             exit 0;
           },
           'logconf=s'               => \$log4perl_config,
           'study=s'                 => \@studies,
           'user-first'              => \$userfirst,
           'verbose'                 => \$verbose) or croak "\n$what_on_earth\n";

if ($log4perl_config) {
  Log::Log4perl::init($log4perl_config);
}
else {
  Log::Log4perl::init(\$embedded_conf);
}

my $log = Log::Log4perl->get_logger('npg.acls');
if ($verbose) {
  $log->level($INFO);
}
if ($debug) {
  $log->level($DEBUG);
}

if (@studies && $userfirst) {
  $log->logcroak(q{Options --study and --user-first are mutually exclusive!});
}

main();

exit 0;

sub _public_hash {
  my $group2users = shift;

  my @public = ();
  foreach my $group ( keys %{ $group2users } ) {
    push @public, @{ $group2users->{$group} };
  }

  $log->info(q{The public group has }, scalar @public, q{ members});
  $log->debug(q{public group membership: }, join q(, ), @public);

  my %phash = map { $_ => 1 } @public;

  return \%phash;
}

sub _dnap_members {
  my @dnap_members = ();
  ##no critic (InputOutput::ProhibitBacktickOperators)
  for (split /^/smx, qx/igroupadmin lg dnap_ro/) {
  ##use critic
    chomp;
    my $admin_uname = $_;
    next if (not $admin_uname =~ /#/smx);
    $admin_uname =~ s/#.*$//smx;
    push @dnap_members, $admin_uname;
  }
  return @dnap_members;
}

sub _old_users {
  my @old_users = ();
  if ($dburl && $userfirst) {
    my $client;
    if ($ca_file) {
      my $options = {
        ssl => {
          'SSL_ca_file' => $ca_file
        }
      };
      $client = MongoDB->connect(
        $dburl,
        $options
      );
    } else {
      $client = MongoDB->connect($dburl);
    }
    my $users_coll = $client->ns($dbname);

    ##no critic (ValuesAndExpressions::RequireInterpolationOfMetachars)
    my $cursor = $users_coll->find({q{groups}  => {q{$all} => \@studies}},
                                 {projection => {user => 1}});
    ##use critic

    while (my $doc = $cursor->next) {
      push @old_users, $doc->{'user'};
    }
    $client->disconnect;
  }
  return @old_users;
}

sub _uid_to_irods_uid {
  my ($public_hash, $u) = @_;
  return $public_hash->{$u} ? ($u) : ();
}

sub _print_json {
  my $data = shift;
  print to_json($data)."\n" or croak 'Failed to write out json';
  return;
}

sub _user_first {
  my $user2groups = shift;

  my $today = DateTime
    ->now(time_zone=> DateTime::TimeZone->new(name => q[local]))
    ->datetime();

  foreach my $uname ( uniq (keys %{$user2groups}, _old_users()) ) {
    if ( $dburl ) {
      if ( exists $user2groups->{$uname} ) {
        _print_json({user          => $uname.$eml,
                     groups        => $user2groups->{$uname},
                     current       => JSON::true,
                     last_modified => $today});
      } else {
        # User was in db previously, but not in new list of users.
        # Remove user from all groups, set current to false.
        _print_json({user          => $uname.$eml,
                     groups        => [],
                     current       => JSON::false,
                     last_modified => $today});
      }
    } else {
      _print_json({user          => $uname.$eml,
                   groups        => $user2groups->{$uname},
                   last_modified => $today}
      );
    }
  }

  return;
}

sub main {

  my $ldap = WTSI::DNAP::Utilities::LDAP->new;
  my $group2users = $ldap->map_groups_to_users();
  my $rs = npg_warehouse::Schema->connect()->resultset(q(CurrentStudy));
  if (@studies) {
    $rs = $rs->search({internal_id => \@studies});
  }

  my $public_hash = _public_hash($group2users);
  my %user2groups;
  my $group_count = 0;

  my @dnap_members = _dnap_members();
  while (my $study = $rs->next) {
    my $study_id = $study->internal_id;
    my $dag_str  = $study->data_access_group || q();
    my $is_seq   = $study->npg_information->count ||
                   $study->npg_plex_information->count;

    $log->debug(qq{Working on study $study_id, SScape data access: '$dag_str'});

    my @members;
    my @dags = $dag_str =~ m/\S+/smxg;
    if (@dags) {
      # if strings from data access group don't match any group name try
      # treating as usernames
      @members = map { _uid_to_irods_uid($public_hash, $_)   }
                 map { @{ $group2users->{$_} || [$_] } } @dags;
    } elsif ($is_seq) {
      @members = keys %{$public_hash};
    } else {
      # remains empty
    }
    push @members, @dnap_members;

    $log->info(qq{Study $study_id has }, scalar @members, q{ members});
    $log->debug(q{Members: }, join q(, ), @members);

    if (! $userfirst ) {
      @members = map {$_ . $eml} @members;
      _print_json({access_control_group_id => $study_id,
                   members                 => \@members});
    } else {
      foreach my $uname ( uniq @members ) {
        push @{$user2groups{$uname}}, $study_id;
      }
    }

    $group_count++;
  }

  if ( $userfirst ) {
    _user_first(\%user2groups);
  }

  $log->info("Considered $group_count Sequencescape studies");

  return;
}
