/**
 * clean_directory.js by Craine Runton
 * Source: https://github.com/cmrunton/symantec-dlp-parsing
 * 
 * See /LICENSE for licensing details
 * 
 * USAGE: node clean_directory.js /path/to/directory
 */

const readline = require('readline');
const fs = require('fs');
const parse = require('csv-parse');
var status = require('node-status');

const input_dir = process.argv[2];
const output_dir = input_dir+'/clean/';

var process_start_time = new Date(),
file_list = [],
iteration = 0,
progress_bar,
total_lines = 0,
end_message = [];

get_dir_content(input_dir);

/**
 * Gets the contents of the target directory, and omits sub-dirs, and the .DS_Store file for Mac users
 * 
 * @param {string} directory The directory that contains the CSV files you want to parse
 */
function get_dir_content(directory) {
  var contents = fs.readdirSync(directory);
  for (var name in contents) {
    if (fs.statSync(directory+'/'+contents[name]).isFile() && contents[name] != '.DS_Store') {
      file_list.push(contents[name]);
    }
  };
  clean_files(file_list);
};

/**
 * Cleans each of the files in the target directory
 * 
 * @param {string} file_array Array containing the file names for each of the CSVs in the scanned directory
 */
function clean_files(file_array) {
  var lines = 0;

  count_lines(file_array[iteration]);
};

/**
 * Counts the number of lines in the file we will parse so we can have a pretty progress bar on the bottom of the 
 *  console
 * 
 * @param {string} target_file The file name of the CSV that will be cleaned in this iteration
 */
function count_lines(target_file) {
  var file_start_time = new Date(),
  lines = 0;

  // Create the input stream to read the line count
  const rl = readline.createInterface({
    input: fs.createReadStream(input_dir+'/'+target_file)
  });

  // Start counting lines
  rl.on('line', (line) => {
    lines++;
  }).on('close', function() {
    // Setup the progress bar output
    progress_bar = status.addItem('File '+ (iteration + 1) +' of '+file_list.length+': '+target_file, {
      type: ['count','bar','percentage'],
      count: 0,
      max: lines,
      color: 'cyan'
    });

    // Init the progress bar
    status.start({
      invert: false,
      label: 'Cleaning CSVs'
    });

    // Call the function to begin parsing the file
    parse_file(target_file, file_start_time, lines);
  });
}

/**
 * Parses the CSV file to pull out only the relevant details
 * 
 * @param {string} target_file The name of the file being processed
 * @param {object} file_start_time A Date object taken when the parsing operation started for this file
 * @param {int} lines The number of lines that are in the file being processed
 */
function parse_file(target_file, file_start_time, lines) {
  lines_read = 0;
  var space = ' ';
  // Write the results to a file
  fs.writeFile(output_dir+target_file, space, function(err) {
    // If the write errored out, notify
    if (err) { 
      // Stop the status bar
      status.stop();
      console.log('Error writing file. \n'+stats);
    }
  })

  var output_file = fs.createWriteStream(output_dir+'/'+target_file);

  output_file.on('open', function() {
    // Create a new input stream
    const rl = readline.createInterface({
      input: fs.createReadStream(input_dir+'/'+target_file)
    });
    
    // Start parsing lines
    rl.on('line', (line) => {
      // Parse the line using csv-parse
      parse(line, {delimiter: ','}, function(err, data){  
        var severity = data[0][3];
        var policy = data[0][7];
        var matches = data[0][8];
        var location = data[0][9]
          location = location.replace(/,/g , "_");
        var location_array = location.split('/').slice(4);
        var department = location_array[0];
        var subfolder = location_array[1];
        var file_owner = data[0][13];
        var last_modified_date = data[0][15];
        var created_date = data[0][16];
        var last_access_date = data[0][17];
        var data_owner_name = data[0][18];

        var line = severity+','+policy+','+matches+','+location+','+department+','+subfolder+','+file_owner+','+data_owner_name+','+created_date+','+last_access_date+',//'+last_modified_date+'\n';
        // Append the new line to the output file
        
        if (lines_read === 0 ) {
          output_file.write("Severity, Policy, Matches, Location, Department, Subfolder, File Owner, Data Owner Name, File Created, Last Accessed, Last Modified\n");
        } else {
          output_file.write(line);
        }
        lines_read++;
      });

      // Increment the progress bar 
      progress_bar.inc();
    })
    .on('close', function() {
      setTimeout(function() {
        output_file.end()

        // Notify the operation is complete        
        var end_time = new Date(),
        duration = (end_time - file_start_time)/1000,
        stats = lines +' lines read in '+duration+' seconds';
        end_message.push('Count complete. See '+output_dir+target_file+' for results.'+stats);

        total_lines = total_lines + lines;

        // Up the iteration and loop if not all files have been hit
        iteration ++;
        if (iteration < file_list.length) {
          count_lines(file_list[iteration]);
        } else {
          // Stop the status bar
          status.stop();

          console.log('Complete');
          process.exit();
        }

      }, 500);
      // Get the final run time and stats for the console output

    });
  });
}