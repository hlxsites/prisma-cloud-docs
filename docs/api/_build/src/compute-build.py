import argparse
import os.path
import subprocess
import fnmatch
import shutil
from pathlib import Path

def main():
  """
  Read an OpenAPI spec, identify all supported endpoints, and output a
  new spec that only contains supported endpoints to a file for self hosted and SAAS compute spec file.
  """
  if(os.path.exists(args.specfile)):
    if pandev_location:
      value = "python3 src/gen_supported_spec_saas.py "+ args.specfile +" ../supported.cfg "+ "--panloc "+ pandev_location
      subprocess.call(value, shell=True)
    else:
      value = "python3 src/gen_supported_spec_saas.py "+ args.specfile +" ../supported.cfg "
      subprocess.call(value, shell=True)
    if pandev_location:
      shvalue = "python3 src/gen_supported_spec_sh.py "+ args.specfile +" ../supported.cfg "+ "--panloc "+ pandev_location
      subprocess.call(shvalue, shell=True)
    else:
      shvalue = "python3 src/gen_supported_spec_sh.py "+ args.specfile +" ../supported.cfg "
      subprocess.call(shvalue, shell=True)
  

  else:
    print("File not found")

# cleanup the supported and enriched file created during the spec processing.
def cleanup():
   for filename in os.listdir('.'):
    if fnmatch.fnmatch(filename, '*enriched*.json'):
        os.remove(filename)
        print(filename+" deleted")
    if fnmatch.fnmatch(filename, '*supported*.json'):
        os.remove(filename)
        print(filename+" deleted")


#create previous release folder for copying product content in pan.dev repo
def get_prev_release_no(pandev_location):
      saas_folder =  os.path.join(pandev_location, 'openapi-specs','cwpp')
      for previous_rls_saas_file in os.listdir(saas_folder):
        # check only previous release json file
        if previous_rls_saas_file.endswith('.json'):
          saas_release_no_list= previous_rls_saas_file.split("-")
          previous_release_no_val = saas_release_no_list[1]+"-"+saas_release_no_list[2]
          return previous_release_no_val

#If the user provides the --panloc argument, the previous release folder is created and all the .md files are transfered to the directory. Keeping a copy of md files in the main folder to
#make changes for the current release.
def copy_product_folders(pandev_location):
  previous_release_no = get_prev_release_no(pandev_location)
  
  destination_folder = os.path.join(pandev_location, 'products','compute','api',previous_release_no) 
  parentDir = Path(destination_folder).parent
  
  if os.path.exists(destination_folder):
      shutil.rmtree(destination_folder, ignore_errors=True)
  
  os.mkdir(destination_folder)

  for file_name in os.listdir(parentDir):
    # construct full file path
    source_file = os.path.join(parentDir,file_name)
   
    if fnmatch.fnmatch(source_file, '*.md'):
      destination_file = os.path.join(destination_folder,file_name)
      
      shutil.copy(source_file, destination_file)

if __name__ == '__main__':
  '''
  Take input from the the user as the spec files and the pan.dev repo location on the local system.

  '''
  parser = argparse.ArgumentParser(description='Generates an OpenAPI spec with supported endpoints only')
  parser.add_argument('specfile', help='Path to OpenAPI spec file')
  parser.add_argument('--panloc', help='Specify the p[an.dev location on your local system')
  args = parser.parse_args()
  if args.panloc:
    pandev_location = args.panloc
    copy_product_folders(pandev_location)
  else:
    pandev_location = ""
  main()
  cleanup()
    
