// SETTINGS BELOW //

// data feed URLs
var dataSources = [
  "http://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
  "https://qz.com/feed/",
];
  
// keyword triggers
var keyWords = [
  "macron", "syria"
];

// subreddits
var subreddits = ['plex', 'plexacd', 'datahoarder', 'seedboxes', 'radarr', 'sonarr', 'slavelabour'];


var headlinesPerSource = 5;                    // Number of headlines per news source
var emailTitle = "The Day Ahead";          // What to title the email
var daysAhead = 2;                        // Number of days out to scan events


// DO NOT MODIFY BELOW

// List to hold headlines that contain keywords
var topStories = [];
var userProperties = PropertiesService.getUserProperties();
var formattedDate = Utilities.formatDate(new Date(), "EST", "EEEE MMMM dd yyyy");

var numberOfEvents = 0;
var numberOfBirthdays = 0;

function deliverNews()
{
  var newsMsg = ""; // will hold the completed HTML to email
  var deliverAddress = Session.getActiveUser().getEmail();
  var calEventsStr = "<h2>Calendar</h2>";
  
  var calendars = CalendarApp.getAllCalendars();
  var calEvents = [];

  var now = new Date();
  var then = new Date(now.getTime() + (1000 * 60 * 60 * 24 * daysAhead));
  for(i in calendars){
    var loopEvents = calendars[i].getEvents(now, then);
    if(loopEvents.length > 0){
      for(j in loopEvents){
        calEvents.push(loopEvents[j]);
      }
    }
  }
  
  var calendarTexts = buildEventsHTML(calEvents);
  
//  if (calEvents.length > 0) {
  if (numberOfEvents > 0) {
    calEventsStr += "<p>You have " + numberOfEvents + " events today</p>";
    calEventsStr += calendarTexts[0];
  }
  else {
    calEventsStr += "<p>No events today</p>";
  }
  
  calEventsStr += "<h2>Birthdays</h2>";
  
  if (numberOfBirthdays > 0) {
    calEventsStr += "<p>You have " + numberOfBirthdays + " upcoming birthdays</p>";
    calEventsStr += calendarTexts[1];
  }
  else {
    calEventsStr += "<p>No birthdays today</p>";
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
  
  var currentEvents = "<h2>Current Events</h2>";
  currentEvents += getWikipediaCurrentEvents();
  
  var weatherString = "<h2>Weather</h2>";
  var weatherObject = getWeather();
//  for (property in weatherObject){
//    weatherString += property + ": " + weatherObject[property] + "\n"
//  }
  weatherString += 'Today: ' + weatherObject.hourly.summary + '<br />' + 'This week: ' + weatherObject.daily.summary;
  
  
  var redditString = "<h2>Reddit</h2>";
  for (var i = 0 ; i < subreddits.length ; i++){
    redditString += scrapeReddit(subreddits[i]);
  }

  // put all the data together
  newsMsg = "<h1>" + emailTitle + "</h1>\n" + calEventsStr + weatherString + currentEvents  + topStoriesStr + feedStoriesStr + redditString;
  
  // Deliver the email message as HTML to the recipient
  GmailApp.sendEmail(deliverAddress, emailTitle + ': ' + formattedDate, "", { htmlBody: newsMsg });
  
 
  
}

function getEventsForToday() {
  var returnEvents = null;
  
  var calendars = CalendarApp.getAllCalendars();
  var events = [];

  var now = new Date();
  var then = new Date(now.getTime() + (1000 * 60 * 60 * 24 * 2));
  for(i in calendars){
    var loopEvents = calendars[i].getEvents(now, then);
    if(loopEvents.length > 0){
      for(j in loopEvents){
        Logger.log('what event title: ', loopEvents[j].title);
        events.push(loopEvents[j]);
      }
    }
  }
  returnEvents = events.items;
  return returnEvents;
}

function buildEventsHTML(calEvents) {
  var str = "";
  var birthdaysStr = "";

  str += "";
  birthdaysStr += "<ul>";
  for (var i=0; i < calEvents.length; i++) {
    if (CalendarApp.getCalendarById(calEvents[i].getOriginalCalendarId()).getName().toLowerCase().indexOf('birthdays') === -1 && CalendarApp.getCalendarById(calEvents[i].getOriginalCalendarId()).getName().toLowerCase().indexOf('contacts') === -1){
      str += "<strong>" + 
      calEvents[i].getTitle() + "</strong> <small> " + calEvents[i].getStartTime() + "@ " + calEvents[i].getLocation() + " </small>";
      if (calEvents[i].getDescription()) {
        str += "<br />" + calEvents[i].getDescription().slice(0,210) + "<br /><br />"
      }
      numberOfEvents++;
    } else {
      birthdaysStr += "<li>" + 
        calEvents[i].getTitle() + " <small>" + Utilities.formatDate(new Date(calEvents[i].getAllDayStartDate()), 'GMT', 'EEEE MMMM dd yyyy') + "</small></li>";
      numberOfBirthdays++;
    }
}
//  str += "</ul>";
  birthdaysStr += "</ul>";
  
  return [str, birthdaysStr];
}

function getWikipediaCurrentEvents(){
  var feedSrc = UrlFetchApp.fetch("https://wp-current-events-rss.herokuapp.com/").getContentText();
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
    //str += "<h2><a href='"+channel.getChildText("link")+"'>"+channel.getChildText("title")+"</a></h2>\n";

    // Limit the number of headlines
    itemCount = (items.length > 1 ? 1 : items.length);
    //str += "<ul>";
    for (var i=0; i < itemCount; i++) {
      var strDescription = items[i].getChildText("description");
      str += strDescription + "\n\n";
    }
//    str += "</ul></div>\n";
    str += "</div>\n";
  }
  
  return str;
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
    itemCount = (items.length > headlinesPerSource ? headlinesPerSource : items.length);
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

function getWeather(){
  var url = 'https://api.darksky.net/forecast/240b50740f1e67b00d7486a93c8df404/' + getLastPosition();
  var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
  var json = JSON.parse(response);
  return json;
}

function getLastPosition(){
  var url = 'https://feeds.foursquare.com/history/PVIWVMZG2T3IZQNXCKQL1DW3US5VV2M5.kml';
  var response = UrlFetchApp.fetch(url).getContentText();
  var document = XmlService.parse(response);
  var coordinates = document.getRootElement().getChild('Folder').getChild('Placemark').getChild('Point').getChildText('coordinates');
  coordinates = coordinates.split(',');
  coordinates = coordinates[1] + ',' + coordinates[0];
  return coordinates;
}

function scrapeReddit(sub) {
  
// userProperties.setProperty(sub, ''); // un-comment if you want to display all reddit posts, regarless of wether they have been sent before
  
  var redditUrl = 'https://www.reddit.com/r/' + sub + '/new.xml?limit=100&before=' + userProperties.getProperty(sub);
  Logger.log(redditUrl);
  
  
  while (!response){
    try {
      var response = UrlFetchApp.fetch(redditUrl).getContentText();
    }
    catch (e) {
      Logger.log("Address unavailable: " + redditUrl);
      Logger.log(e);
    }
  }

//  var response = UrlFetchApp.fetch(redditUrl).getContentText();
  var document = XmlService.parse(response);
  var root = document.getRootElement();
  var entries = root.getChildren();
   
  var data = new Array();
  for (var i = 0; i < entries.length ; i++) {
    if (entries[i].getName() === 'entry') {
      for (var k = 0 ; k < entries[i].getChildren().length ; k++){
        if (entries[i].getChildren()[k].getName() === 'title') var title = entries[i].getChildren()[k].getText();
        else if (entries[i].getChildren()[k].getName() === 'updated') var date = entries[i].getChildren()[k].getText();
        else if (entries[i].getChildren()[k].getName() === 'id') var id = entries[i].getChildren()[k].getText();
        else if (entries[i].getChildren()[k].getName() === 'link') var link = entries[i].getChildren()[k].getAttribute('href').getValue();
      }
    data.push( { date: date, title: title, link: link, id: id } );
  }
  }
  
  // Now let's format that data as a string
  
  var str = '<h3>r/' + sub + '</h3>';
  for (var j = 0 ; j < data.length ; j++){
    str +=  '<a href="' + data[j].link + '">' + data[j].title + '</a><small>' + ' ' + Utilities.formatDate(new Date(data[j].date), "UTC", "MMMM dd HH:mm") + '</small><br />';
  }
  
  if (!data[0]) str += 'No new posts in this subreddit.'
  
  if (!userProperties.getProperty(sub)) userProperties.setProperty(sub, data[0].id);
  else if (userProperties.getProperty(sub) && data.length > 0) userProperties.setProperty(sub, data[0].id );
  
  return str;
}
