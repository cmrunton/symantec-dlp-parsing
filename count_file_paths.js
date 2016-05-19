/**
 * count_file_paths.js by Craine Runton
 * Source: https://github.com/cmrunton/symantec-dlp-parsing
 * 
 * See /LICENSE for licensing details
 * 
 * USAGE: node count_file_paths.js [json | csv | all]
 */

const readline = require('readline');
const fs = require('fs');
const parse = require('csv-parse');
var status = require('node-status');

// Capture the input filename, and slice off the extension for the output filename
const input = process.argv[2];
const output = './counts/'+input.slice(0,-3);

// Capture what type of file the user wants output
const file_types = process.argv[3];

var lines = 0,
directories = {},
start_time = new Date(),
progress_bar;

count_lines();

/**
 * Counts the number of lines in the file we will parse so we can have a pretty progress bar on the bottom of the 
 *  console
 */
function count_lines() {
  // Create the input stream to read the line count
  const rl = readline.createInterface({
    input: fs.createReadStream(input)
  });

  // Start counting lines
  rl.on('line', (line) => {
    lines++;
  }).on('close', function() {
    // Setup the progress bar output
    progress_bar = status.addItem("lines parsed", {
      type: ['count','bar','percentage'],
      max: lines
    });

    // Init the progress bar
    status.start();

    // Call the function to begin parsing the file
    parse_file();
  });
};

/**
 * Parses the CSV file to get the counts of folders at the 4th level of the NAS, e.g. 
 *  file path you're scanning is: //nas.root/share.root/directory
 *  The script parses the location for the directory here ↑
 */
function parse_file() {
  // Create a new input stream
  const rl = readline.createInterface({
    input: fs.createReadStream(input)
  });
  
  // Start parsing lines
  rl.on('line', (line) => {
    parse(line, {delimiter: ','}, function(err, data){
      // Split the filepath string by / and push the directory name to the location array
      // If you need to recurse deeper into your folder structure, change the .slice(4) to 5 or 6 or whatever
      //    meets your needs
      var location = data[0][9].split('/').slice(4);
      var last_access_date =  new Date(Date.parse(data[0][17])),
        last_access_date = last_access_date.getTime();
      var created_date =  new Date(Date.parse(data[0][16])),
        created_date = created_date.getTime();

      if (directories.hasOwnProperty(location[0])) {
        var old_count = directories[location[0]]['count'],
        old_access = directories[location[0]]['most_recent_access'],
        old_create = directories[location[0]]['most_recent_create'];

        directories[location[0]] = {
          count : old_count + 1,
          most_recent_access : (old_access > last_access_date ? old_access : last_access_date), //17
          most_recent_create : (old_create > created_date ? old_create : created_date) //16
        };
      } else {
        directories[location[0]] = {
          count : 1,
          most_recent_access : last_access_date,
          most_recent_create : created_date
        };
      }

    });

    // Increment the progress bar 
    progress_bar.inc();
  })
  .on('close', function() {
    for (var prop in directories) {
      if (directories.hasOwnProperty(prop)) { 

        //console.log(directories[prop].count);
        var date1 = new Date(directories[prop].most_recent_access);
        directories[prop].most_recent_access = date1.toString();
  
        var date2 = new Date(directories[prop].most_recent_create);
        directories[prop].most_recent_create = date2.toString();
      }
    }
    // Stop the status bar
    status.stop();

    switch (file_types) {
      case "json":
        format_json(directories);
        break;
      case "csv":
        format_csv(directories);
        break;
      case "all":
        format_json(directories);
        format_csv(directories);
        break;
      default: 
        format_json(directories);
        break;
    }
  });
};

/**
 * Takes the object that we built when we parsed the CSV and makes it into pretty JSON
 *  Useful if you want to pass the json off to something like D3 for visualizaitons 
 * 
 * @param {object} data he resulting data object that we made from parsing the CSV
 */
function format_json(data) {
  var formatted = JSON.stringify(data, null, 2);
  var filename = output + 'json';
  write_file(filename, formatted);
};

/**
 * Takes the parsed data and formats it into another CSV. Useful for passing along to other
 *  humans for use in Excel or whatever
 * 
 * @param {object} data The resulting data object that we made from parsing the CSV
 */
function format_csv(data) {
  // Sort the results smallest to largest
  var sorted = [];
  for (var dir in data) {
    sorted.push([dir, data[dir]['count'], data[dir]['most_recent_access'], data[dir]['most_recent_create'] ])
  }
  sorted.sort(function(a, b) {return a[1] - b[1]});
  sorted.reverse();

  // Take the sorted result array and make a pretty string 
  var formatted = String()
    +'user, incident_count, most_recent_access, most_recent_create\n';
  for (var i = 0; i < sorted.length; i++) {
    formatted += sorted[i][0] +','+ sorted[i][1] +','+ sorted[i][2] +','+ sorted[i][3] +'\n';
  }

  var filename = output + 'csv';
  write_file(filename, formatted);

};

/**
 * Actually writes the formatted data into a file
 * 
 * @param {string} filename The filename that we are going to dump the data into
 * @param {string} data The data string that fills the file
 */
function write_file(filename, data) {
    // Write the results to a file
    fs.writeFile(filename, data, function(err) {
      // Get the final run time and stats for the console output
      var end_time = new Date(),
      duration = (end_time - start_time)/1000,
      stats = lines +' lines read in '+duration+' seconds';
      
      // If the write errored out, notify
      if (err) {
        console.log('Error writing file. \n'+stats);
      }

      // Notify the operation is complete
      console.log('Count complete. See  '+output+' for results. \n'+stats);
    })
};


