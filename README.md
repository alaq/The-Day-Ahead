# The-Day-Ahead

The Day Ahead is a heavily modified version of [an original Google script](http://joemarini.blogspot.com/2014/06/building-customized-news-service-with.html) by [@JoeMarini](https://github.com/joemarini).
It sends a sumary email to yourself with useful information for your day.

## Features/Information included
- Upcoming events off Google Calendar
- Upcoming birthdays off Google Calendar/Facebook (if you added the Facebook feed to your calendar)
- The weather based off your last known location on Foursquare
- Events from the previous day from [Wikipedia's Current events portal](https://en.wikipedia.org/wiki/Portal:Current_events) (for un-biased information)
- A set number of headlines from RSS sources
- A Top Stories section, which bundles headlines matching any pre-defined keyword (e.g. Trump, Syria, etc.)
- All new posts in your list of subreddits since you last received the email

## How to Install
1. Open script.google.com
2. Paste dayahead.gs in the editor
3. Get your Foursquare KML feed url from https://foursquare.com/feeds/ and add it to the script
4. Get a Dark Sky API key from forecast.io and add it to the script
5. Run the script (deliverNews) to get the permissions working
6. Set a trigger so it's sent on your schedule
