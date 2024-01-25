import json
import argparse
import os.path
import subprocess
import shutil
import fnmatch
from pathlib import Path


def copy_compute_cwpp(fileName, output_file_location):
  """
  Read the pan.dev location and copies the sorted spec files to release folders.

  """
  
  if output_file_location:
    if fnmatch.fnmatch(fileName, '*saas*.json'):
      release_no_list= fileName.split("-")
      path = os.path.join(output_file_location, 'openapi-specs','cwpp', release_no_list[1]+"-"+release_no_list[2])
      if os.path.exists(path):
        shutil.rmtree(path, ignore_errors=True)
      try:
        os.mkdir(path)
        
        file_path = os.path.join('.', fileName)
        shutil.copy(file_path, path)
        print(fileName+" file copied at " + path)
      except Exception as e:
        print(e)


    if fnmatch.fnmatch(fileName, '*sh*.json'):
      release_no_list= fileName.split("-")
      path = os.path.join(output_file_location, 'openapi-specs','compute', release_no_list[1]+"-"+release_no_list[2])
      if os.path.exists(path):
        shutil.rmtree(path, ignore_errors=True)
        
      try:
        os.mkdir(path)
        file_path = os.path.join('.', fileName)
        shutil.copy(file_path, path)
        print(fileName+" file copied at " + path)
      except Exception as e:
        print(e)




if __name__ == '__main__':
  
  parser = argparse.ArgumentParser(description='Enrich basic OpenAPI spec for publication on pan.dev.')
  parser.add_argument('fileName', type=str, help='Path to OpenAPI spec')
  parser.add_argument('--panloc', help = 'pan.dev folder location on local system' )
  args = parser.parse_args()
 
  copy_compute_cwpp (args.fileName,args.panloc)
 