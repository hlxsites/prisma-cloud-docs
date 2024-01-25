import json
import argparse
import subprocess

def main():
  """
  Read the OpenAPI spec file and sort the tags.
  Print the result to a file.
  """
  parser = argparse.ArgumentParser(description='Enrich basic OpenAPI spec for publication on pan.dev.')
  parser.add_argument('inputfilename', type=str, help='Path to OpenAPI spec')
  parser.add_argument('--panloc', help = 'pan.dev folder location on local system' )
  args = parser.parse_args()
 
  with open(args.inputfilename, 'r') as json_file:
    json_data = json.load(json_file)
    for tag in json_data['tags']:
        json_data['tags'].sort(key=lambda x: x['name'])
    for path, methods in json_data["paths"].items():
        for method in ["put", "get", "delete", "post", "patch"]:
            if method in methods and "Supported API" in methods[method].get("tags", []):
                methods[method]["tags"].remove("Supported API")

  outfile = args.inputfilename.replace("_","-")
  outFileName = outfile.replace("-enriched-","-")
  with open(outFileName, 'w') as json_file:
    json.dump(json_data, json_file, indent=4)

  print(f"Spec file transfer progress...")
  if args.panloc:
    value = "python3 src/update_spec_file.py" +" " + outFileName + " " + "--panloc "+ args.panloc
    subprocess.call(value, shell=True)
  else:
    value = "python3 src/update_spec_file.py" +" " + outFileName + " "
    subprocess.call(value, shell=True)
    
  print(f"Spec file transfer complete.")

if __name__ == '__main__':
  main()