import json
import argparse
import os.path
import subprocess
import shutil
import fnmatch
from pathlib import Path

'''
Copy the description folder from prism-cloud repo to the pan.dev /desc repo to 'compute' folder and move previous release desc to the release folder.
'''

def copy_desc_sh_folders(des_location, previous_rls_folder):
  desc_path = "../descriptions"
  if os.path.exists(des_location):
    shutil.move(des_location,previous_rls_folder )
  shutil.copytree(desc_path, des_location)

'''
Copy the description folder from prism-cloud repo to the pan.dev /desc repo for 'cwpp' folder
'''
def copy_desc_folders(des_location):
  desc_path = "../descriptions"
  if os.path.exists(des_location):
    shutil.rmtree(des_location)
  
  shutil.copytree(desc_path, des_location)


'''
  Read the pan.dev location and copies the sorted spec files to pan.dev cwpp and compute folders and the previous release file into a new previous release folder.

'''
def copy_compute_cwpp(specfile, output_file_location):
  if output_file_location:
    if fnmatch.fnmatch(specfile, '*saas.json'):
      
      saas_folder =  os.path.join(output_file_location, 'openapi-specs','cwpp')
      for previous_rls_saas_file in os.listdir(saas_folder):
        previous_rls_saas_file_loc = os.path.join(saas_folder, previous_rls_saas_file)
        # check only previous release json file
        if previous_rls_saas_file.endswith('.json'):
          saas_release_no_list= previous_rls_saas_file.split("-")
          previous_release_no_val = saas_release_no_list[1]+"-"+saas_release_no_list[2]
         # update_release(previous_release_no_val)
          previous_rls_saas_loc = os.path.join(saas_folder, previous_release_no_val)

          if os.path.exists(previous_rls_saas_loc):
            shutil.rmtree(previous_rls_saas_loc, ignore_errors=True)
          try:
            os.mkdir(previous_rls_saas_loc)
            file_path = os.path.join('.', specfile)
            shutil.move(file_path, saas_folder)
            print(specfile+" file moved to " + saas_folder)
            shutil.move(previous_rls_saas_file_loc, previous_rls_saas_loc)
            print(previous_rls_saas_file+" file moved to " + previous_rls_saas_loc)
            copy_desc_folders(saas_folder+"/desc")
            
          except Exception as e:
            print(e)

    

    if fnmatch.fnmatch(specfile, '*sh.json'):
      sh_folder =  os.path.join(output_file_location, 'openapi-specs','compute')
      for previous_rls_sh_file in os.listdir(sh_folder):
        previous_rls_sh_file_loc = os.path.join(sh_folder, previous_rls_sh_file)
        # check only previous release json file
        if previous_rls_sh_file.endswith('.json'):
          
          sh_release_no_list= previous_rls_sh_file.split("-")
          previous_rls_sh_loc = os.path.join(sh_folder, sh_release_no_list[1]+"-"+sh_release_no_list[2])
          if os.path.exists(previous_rls_sh_loc):
            shutil.rmtree(previous_rls_sh_loc, ignore_errors=True)
          try:
            os.mkdir(previous_rls_sh_loc)
            file_path = os.path.join('.', specfile)
            shutil.move(file_path, sh_folder)
            print(specfile+" file moved to  " + sh_folder)
            shutil.move(previous_rls_sh_file_loc, previous_rls_sh_loc)
            print(previous_rls_sh_file+" file moved to " + previous_rls_sh_loc)
            copy_desc_sh_folders(sh_folder+"/desc", previous_rls_sh_loc)

          except Exception as e:
            print(e)



if __name__ == '__main__':
  
  parser = argparse.ArgumentParser(description='Enrich basic OpenAPI spec for publication on pan.dev.')
  parser.add_argument('fileName', type=str, help='Path to OpenAPI spec')
  parser.add_argument('--panloc', help = 'pan.dev folder location on local system' )
  args = parser.parse_args()

  copy_compute_cwpp (args.fileName,args.panloc)
 
 