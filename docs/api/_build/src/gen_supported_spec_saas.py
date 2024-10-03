import argparse
import sys
import collections
from contextlib import suppress
import copy
from dataclasses import dataclass
import json
import pathlib
import re
import subprocess
import os.path
from pathlib import Path

# Constants
COMMA = ","


METHODS = [
  'get', 'head', 'post', 'put', 'delete',
  'connect', 'options', 'trace', 'patch'
]


# Command line arguments
@dataclass()
class Config:
  spec: dict
  inclusions: list
  exclusions: list 

  def __post_init__(self):
    """Evaluate wildcards in the list of inclusions and exclusions"""
    version = self.spec['info']['version']
    major, minor, *other = version.split('.')
    v = f"{major}.{minor}"
  
    self._replace_wildcard(self.inclusions, v)
    self._replace_wildcard(self.exclusions, v)

  def _replace_wildcard(self, eps, v):
    for ep in eps:
       ep.path = ep.path.replace('*', v)

  


# Endpoint read from supported.cfg
@dataclass()
class Endpoint:
  path: str
  method: str

def add_server_details(spec):
  #spec = load_spec_file(spec_file)
  if "servers" not in spec:
    spec["servers"] = []
  server_object = {"url": "PATH_TO_CONSOLE"}
  spec["servers"].append(server_object)


def gen_spec(spec_file, config_file):

  # Read the OpenAPI spec file.
  spec = load_spec_file(spec_file)

  # Read the supported.cfg file.
  inclusions, exclusions = load_config_file(config_file)

  # Create a config object.
  config = Config(spec, inclusions, exclusions)
  
  add_server_details(config.spec)
  # Apply tag to the spec according to the overrides in the config file.
  retag_spec(config)

  # Generate a spec that contains supported endpoints only.
  filter_spec(config.spec)
  remove_x_public(config.spec)
  return config.spec


# A defaultdict automatically creates any items you try to access that don't exist yet.
# A standard Python dict, in contrast, would throw a KeyError.
def hasher():
  return collections.defaultdict(hasher)


def load_spec_file(f):
  """
  Read an OpenAPI spec file in JSON format.
  """
  with open(f, "r") as stream:
    try:
      data = json.load(stream)
    except ValueError as e:
      print('Error: invalid JSON: %s' % e)
      sys.exit(1)

  return data


def load_config_file(f):
  """
  Read a config file, process the entries, and return a list of inclusions
  and a list of exclusions.

  If there are no inclusions or exclusions, return empty lists (len == 0).
  """
  inclusions = list()
  exclusions = list()

  if f is None: return [inclusions, exclusions]

  with open(f, "r") as stream:
    for line in stream:
      line = line.rstrip('\n')
      # Blank line
      if not line:
        continue
      # Comment
      elif line.startswith("#"):
        continue
      # Inclusion
      elif line.startswith("+"):
        ep = process_config_entry(line)
        if ep: inclusions.append(ep)
      # Exclusion
      elif line.startswith("-"):
        ep = process_config_entry(line)
        if ep: exclusions.append(ep)
      # Unknown
      else:
        print(f"Ignoring line from config file - invalid syntax: {line}")

  return inclusions, exclusions


def process_config_entry(line):

    ep = None

    # Strip out the + or - directive.
    l = line[1:]

    # We expect two values: path and method.
    e = l.split(COMMA, 2)
    if len(e) == 2:
      path, method = e
      path = path.strip()
      method = method.strip().lower()
      
      if method in METHODS:
        ep = Endpoint(path, method)

    if not ep:
       print(f"Ignoring line from config file - invalid syntax: {line}")    

    return ep


def retag_spec(config):
  """Apply Supported API to endpoints to the overrides in the config file."""
  # Endpoints to be included
  for ep in config.inclusions:
    try:
      tags = config.spec['paths'][ep.path][ep.method]['tags']
      tags.append('Supported API')
    except KeyError:
      print(f"Ignoring line from config file - can't be found in spec: +{ep.path},{ep.method}")

  # Endpoints to be excluded 
  for ep in config.exclusions:
    try:
      tags = config.spec['paths'][ep.path][ep.method]['tags']
      if 'Supported API' in tags:
        tags.remove('Supported API')
    except KeyError:
      print(f"Ignoring line from config file - can't be found in spec: -{ep.path},{ep.method}")


def filter_spec(spec):
  """Filter out endpoints from spec that aren't tagged as supported."""
  supported_paths = hasher()

  for path in spec['paths']:
    for method in spec['paths'][path]:
      ep = spec['paths'][path][method]
      env = spec['paths'][path][method]['x-prisma-cloud-target-env']
      tags = ep.get('tags', [])
      saas = env.get('saas')
      if 'saas' in env: #remove the details that are needed to be published on pan.dev
        env.pop('saas')
      if 'self-hosted' in env:
        env.pop('self-hosted')
      if (('Supported API' in tags) and (saas is True)):
        supported_paths[path][method] = copy.copy(ep)
  spec['paths'] = copy.copy(supported_paths)

def remove_x_public(spec):
    for path in spec['paths']:
      for method in spec['paths'][path]:
        ep = spec['paths'][path][method]
        x_public_val = ep.get('x-public')
        if x_public_val:
          ep.pop('x-public')

def output_spec(spec,outputFilename):
  """
  Write the spec dict to a file in JSON format.
  """

  with open(outputFilename, "w") as outfile:
    json.dump(spec, outfile, indent=2)


def print_status(spec, details=False):

  if details:
    #print("Supported endpoints")
    #print("-------------------")
    count = 0
    for path in spec['paths']:
      for method in spec['paths'][path]:
        print(f"{path}, {method}")
        count += 1
    #print(f"\nTotal endpoints: {count}")
    #print()

  # Print status to stdout.
  #print("Success!")
  #print("  Wrote file: openapi_supported_saas.json")
  #print("  Run the script with --details to get a list of endpoints in the new spec file")


def main():
  """
  Read an OpenAPI spec, identify all supported endpoints, and output a
  new spec that only contains supported endpoints to a file named
  `openapi_release_no_supported_saas.json`.
  """

  parser = argparse.ArgumentParser(description='Generates an OpenAPI spec with supported endpoints only')
  parser.add_argument('spec',
    help='Path to OpenAPI spec file')
  parser.add_argument('config', nargs='?', default=None,
    help='(Optional) Path to supported.cfg, which overrides which endpoints to include and exclude')
  parser.add_argument('--details', action="store_true",
    help='Print details about the transformation')
  parser.add_argument('--panloc', help = 'pan.dev folder location on local system' )
  args = parser.parse_args()

  outputFilename = Path(args.spec).stem + "_supported_saas.json"
  specValue = gen_spec(args.spec, args.config)
  output_spec(specValue,outputFilename)

  print_status(specValue, args.details)
  #print(f"Supported spec for PCEE in progress...")
  if(os.path.exists(outputFilename)):
      if args.panloc:
        value = "python3 src/enrich_spec_saas.py "+outputFilename+" "+ "../_topic_map.yml "+ "--panloc "+args.panloc
        subprocess.call(value, shell=True)
        #print(f"PCEE supported spec is complete")
      else:
        value = "python3 src/enrich_spec_saas.py "+outputFilename+" "+ "../_topic_map.yml "
        subprocess.call(value, shell=True)
  else:
    print("File not found")


if __name__ == '__main__':
  main()
