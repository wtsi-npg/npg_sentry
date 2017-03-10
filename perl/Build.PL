use strict;
use warnings;

use WTSI::DNAP::Utilities::Build;

my $builder = WTSI::DNAP::Utilities::Build->new(
  'module_name'         => 'npg-sentry',
  'dist_author'         => 'NPG team at WTSI <npg@sanger.ac.uk>',
  'dist_version'        => WTSI::DNAP::Utilities::Build->report_version,
  'dist_abstract'       => 'Sentry DB loading script',
  'license'             => 'gpl',
  'configure_requires'  => {
                             'Module::Build'         => '0.42',
                           },
  'requires'            => {
                             'autodie'               => '2.26',
                             'DateTime'              => '1.42',
                             'Getopt::Long'          => '2.49.1',
                             'List::MoreUtils'       => '0.416',
                             'Log::Log4perl'         => '1.49',
                             'MongoDB'               => '1.6.1',
                             'JSON'                  => '2.61',
                             'WTSI::DNAP::Utilities' => '0.5.4'
                           }
);

$builder->create_build_script;

1;
