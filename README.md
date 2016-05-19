# symantec-dlp-parsing
Node scripts that I use to help parse CSV exports from the Symantec DLP tool into usable data sets

## clean_directory.js
Cleans the specified directory's CSVs into much smaller and more useable CSVs. Gets you between a 50-66% reduction in file size. I've reduced a +1 million row CSV from 960MB to 388MB. The module does *not* recurse into sub-directories,  

### Usage
Assuming you've already done an `npm install`, just 

    node clean_directory.js /path/to/directory

The script will read each CSV in that directory, and then dump the results into `./clean/filename.csv`.

## count\_file_paths.js
Takes one CSV and Parses the CSV file to get the incident counts for a specific level inside your scan. As configured, it'll look for the first-level folder on the NAS mount point. So if your scanning `//nas.root/share.root/*`, it is going to give you counts of incidents for each of the `//nas.root/share.root/-->directories<--`. You'll get the directory name, incident count, most recent file creation date, and most recent file access date.

### Usage

    node count_file_paths.js [json | csv | all]

The script will read in the file, line by line, then write out the results into `./counts/filename.type`. If you don't specify a file type option, then it defaults to JSON. 

## To Do
### clean_directory.js
* Implement a file path check to only add CSVs into the file_list array

### count\_file_paths.js
