// data feed URLs
var dataSources = [
  "https://www.reddit.com/r/plexacd/new.xml",
  "https://www.reddit.com/r/seedboxes/new.xml"
];
// keyword triggers
var keyWords = [
  "chrome", "chromebook", "chromeos", "google", "android", "gmail", "cloud", "app engine", 
  "appengine", "compute engine", "microsoft", "facebook", "apple", "windows phone", "windows 8"
];

// List to hold headlines that contain keywords
var topStories = [];

// Settings
var HEADLINE_LIMIT = 15;                    // Number of headlines per news source
var EMAIL_TITLE = "The Day Ahead";          // What to title the email
var DAYS_AHEAD = 7;                         // Number of days out to scan events


function deliverNews()
{
  var newsMsg = ""; // will hold the completed HTML to email
  var deliverAddress = Session.getActiveUser().getEmail();
  
  var calEventsStr = "<h2>Calendar</h2>";

  // get a list of today's events
    var now = new Date();
  var twoDaysFromNow = new Date(now.getTime() + (48 * 60 * 60 * 1000));
  var calEvents = CalendarApp.getDefaultCalendar().getEvents(now, twoDaysFromNow);
  if (calEvents.length > 0) {
    calEventsStr += "<p>You have " + calEvents.length + " events today</p>";
    calEventsStr += buildEventsHTML(calEvents);
  }
  else {
    calEventsStr += "<p>No events today</p>";
  }
  
  
  // Collect the headlines from the feeds and filter the top stories
  var feedStoriesStr = "";
  for (var i=0; i < dataSources.length; i++) {
    feedStoriesStr += retrieveFeedItems(dataSources[i]);
  }
  
  // Generate the Top Stories list that was created based on keywords
  var topStoriesStr = "<h2>Top Stories</h2>";
  if (topStories.length > 0) {
    topStoriesStr += "<ul>";
    for (var k=0; k<topStories.length; k++) {
      topStoriesStr += "<li style='font-weight:bold'><a href='" + topStories[k].link + "'>" + 
        topStories[k].title + "</a></li>\n";
    }
    topStoriesStr += "</ul>";
  }

  // put all the data together
  newsMsg = "<h1>" + EMAIL_TITLE + "</h1>\n" + calEventsStr + topStoriesStr + feedStoriesStr;
  
  // Deliver the email message as HTML to the recipient
  GmailApp.sendEmail(deliverAddress, EMAIL_TITLE, "", { htmlBody: newsMsg });
  Logger.log(newsMsg.length);
}

function getEventsForToday() {
  var returnEvents = null;
  
  // set the lower bound at midnight
  var today1 = new Date();
  today1.setHours(0,0,0);
  
  // set the upper bound at 23:59:59
  var today2 = new Date();
  today2.setHours(23, 59, 59);
  
  // Create ISO strings to pass to Calendar API
  var ds1 = today1.toISOString();
  var ds2 = today2.toISOString();

//  var result = Calendar.Events.list("primary", {singleEvents: true, timeMin: ds1, timeMax: ds2});
  var now = new Date();
  var twoDaysFromNow = new Date(now.getTime() + (48 * 60 * 60 * 1000));
  var result = CalendarApp.getDefaultCalendar().getEvents(now, twoDaysFromNow);
  // Get the events
  returnEvents = result.items;
  return returnEvents;
}

function buildEventsHTML(calEvents) {
  var str="";

  str += "<ul>";    
  for (var i=0; i < calEvents.length; i++) {
    // Gotcha! All-day events don't have a dateTime, just a date, so need to check
    Logger.log(calEvents[i].start);
    var dateStr = convertDate(calEvents[i].getStartTime() ? 
                              calEvents[i].getStartTime() : 
                              calEvents[i].getStartTime()).toLocaleString();
    str += "<li><a href='" + calEvents[i].htmlLink + "'>" + 
      calEvents[i].summary + "</a> " + dateStr + "</li>";
  }
  str += "</ul>";
  
  return str;
}

function convertDate(tStr) {
//  var dateTimeRE = /(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)([+\-]\d+):(\d+)/;
//  var dateRE = /(\d+)-(\d+)-(\d+)/;
//  var match //= tStr.match(dateTimeRE);
//  if (!match) 
//    match = tStr.match(dateRE);
  var match = tStr;
  
  var nums = [];
  if (match) {
    for (var i = 1; i < match.length; i++) {
      nums.push(parseInt(match[i], 10));
    }
    if (match.length > 4) {
      // YYYY-MM-DDTHH:MM:SS
      return(new Date(nums[0], nums[1] - 1, nums[2], nums[3], nums[4], nums[5]));
    }
    else {
      // YYYY-MM-DD
      return(new Date(nums[0], nums[1] - 1, nums[2]));
    }
  }
  else return null;
}


function retrieveFeedItems(feedUrl) {
  var feedSrc = UrlFetchApp.fetch(feedUrl).getContentText();
  var feedDoc = null;
  var str = "";
  var itemCount = 0;
  var root = null;
  var type = "unknown";
  
  // to avoid having one bad XML feed take down the entire script,
  // wrap the parsing in a try-catch block
  try {
    feedDoc = XmlService.parse(feedSrc);
    if (feedDoc)
      root = feedDoc.getRootElement();
  }
  catch (e) {
    Logger.log("Error reading feed: " + feedUrl);
    Logger.log(e);
  }
  
  // detect the kind of feed this is. Right now only handles RSS 2.0
  // but adding other formats would be easy enough
  if (root && root.getName() == "rss") {
    var version = root.getAttribute("version").getValue();
    if (version == "2.0")
      type = "rss2";
  }
  
  if (type == "rss2") {
    str += "<div>";
    var channel = root.getChild("channel");
    var items = channel.getChildren("item");
    str += "<h2><a href='"+channel.getChildText("link")+"'>"+channel.getChildText("title")+"</a></h2>\n";
    Logger.log("%s items from %s", items.length, channel.getChildText("title"));

    // Limit the number of headlines
    itemCount = (items.length > HEADLINE_LIMIT ? HEADLINE_LIMIT : items.length);
    str += "<ul>";
    for (var i=0; i < itemCount; i++) {
      var keywordFound = false;
      var strTitle = items[i].getChildText("title");
      var strLink = items[i].getChildText("link");
      
      // If the title triggers a keyword, add it to the topStories list
      for (var j=0; j < keyWords.length; j++) {
        // simple index search, could be vastly improved
        if ( strTitle.toLowerCase().indexOf(keyWords[j]) != -1) {
          topStories.push( {title: strTitle, link: strLink} );
          keywordFound=true;
          break;
        }
      }
      // If we didn't add this item to the topStories, add it to the main news
      if (!keywordFound) {
        str += "<li><a href='" + strLink + "'>" + strTitle + "</a></li>\n";
      }
      Logger.log(strTitle);
    }
    str += "</ul></div>\n";
  }
  
  return str;
}
