use strict;
use warnings;

use WTSI::DNAP::Utilities::Build;

my $builder = WTSI::DNAP::Utilities::Build->new(
  'module_name'        => 'npg-sentry',
  'dist_author'        => 'NPG team at WTSI <npg@sanger.ac.uk>',
  'dist_version'       => WTSI::DNAP::Utilities::Build->report_version,
  'dist_abstract'      => 'Sentry DB perl utilities',
  'license'            => 'gpl',
  'configure_requires' => {
                            'Module::Build'         => '0.42',
                          },
  'build_requires'     => {
                            'Test::Compile'         => '1.3.0',
                            'Test::More'            => '0.98',
                            'Test::Perl::Critic'    => '0'
                          },
  'requires'           => {
                            'Carp'                  => '0',
                            'DateTime'              => '0',
                            'DateTime::TimeZone'    => '0',
                            'Getopt::Long'          => '2.49.1',
                            'List::MoreUtils'       => '0.416',
                            'Log::Log4perl'         => '1.49',
                            'MongoDB'               => '1.6.1',
                            'JSON'                  => '2.61',
                            'WTSI::DNAP::Utilities' => '0.5.4',
                            'npg_warehouse::Schema' => '0',
                          }
);

$builder->create_build_script;

1;
