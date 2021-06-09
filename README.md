# spotify-user-profiler
 Profile what kind of music people listen to based off their public playlists
 using the spotify web API.

## Getting a spotify web api key
Go to [spotify](https://developer.spotify.com/console/get-current-user/) and
request a token (no scopes needed).

## USAGE
```
export API_KEY="Your spotify api key"
deno run --allow-env --allow-net profilter.ts [args...] username
modes:
 -a
 --albums                 View the user's top albums
 -A
 --artists                View the user's top artists (default)
 -t
 --tracks                 View the user's top tracks
 -r
 --raw                    View the raw JSON output
filters:
  -fa artist
  --filter-artist artist  Filter by artist name
  -fA album
  --filter-album album    Filter by album name
other:
  -h
  --help                  Print help information
```
