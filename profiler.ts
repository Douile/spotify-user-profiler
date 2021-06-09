'use strict';

/******************************************************************************
****** Constants
******************************************************************************/

const API = 'https://api.spotify.com/v1/';
const USAGE = 
'Lookup the top albums or arists in a spotify user\'s public playlists\n\
deno run --allow-env --allow-net profilter.ts [args...] username';
const HELP = 
'modes:\n\
 -a\n\
 --albums                 View the user\'s top albums\n\
 -A\n\
 --artists                View the user\'s top artists (default)\n\
 -t\n\
 --tracks                 View the user\'s top tracks\n\
 -r\n\
 --raw                    View the raw JSON output\n\
filters:\n\
  -fa artist\n\
  --filter-artist artist  Filter by artist name\n\
  -fA album\n\
  --filter-album album    Filter by album name\n\
other:\n\
  -h\n\
  --help                  Print help information';

/******************************************************************************
****** Types
******************************************************************************/

enum Modes {
  TopArtists = 'artists',
  TopAlbums = 'albums',
  TopTracks = 'tracks',
  Raw = 'profile',
}

interface Filter {
  data: string,
  filter: (value: any, data: string) => boolean,
}
interface PaginatedResponse {
  href: string,
  items: any[],
  limit: number,
  next?: string,
  offset: number,
  previous?: string,
  total: number,
}

interface Profile {
  profile: any,
  tracks: Map<string, any>,
  artists: Map<string, any>,
  albums: Map<string, any>,
}

/******************************************************************************
****** Lib functions
******************************************************************************/

export async function request(url: string) {
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${Deno.env.get('API_KEY')}`,
    }});
  return await res.json();
}

export async function paginatedRequest(url: string): Promise<any[]> {
  let items: any[] = new Array();
  let res: PaginatedResponse = {next: url, href: url, items: items, limit: 0, offset: 0, total: 0};
  while (res.next) {
    res = await request(res.next);
    if (!res.items) break;
    Array.prototype.push.apply(items, res.items);
  }
  return items;
}


export async function profile(user: String, filters: Filter[]): Promise<Profile> {

  const [profile, playlists] = await Promise.all([
    request(`${API}users/${user}`),
    paginatedRequest(`${API}users/${user}/playlists`),
  ]);

  const tracks = new Map();
  const artists = new Map();
  const albums = new Map();
  for (let playlist of playlists) {
    const playlistTracks = await paginatedRequest(playlist.tracks.href);
    for (let track of playlistTracks) {
      if (!track.track) continue;

      let filtered = true;
      for (let filter of filters) {
        if (!filter.filter(track.track, filter.data)) {
          filtered = false;
          break;
        }
      }

      if (!filtered) continue;
      
      if (tracks.has(track.track.id)) {
        tracks.get(track.track.id).occurrences += 1;
      } else {
        track.track.occurrences = 1;
        tracks.set(track.track.id, track.track);
      }

      if (albums.has(track.track.album.id)) {
        albums.get(track.track.album.id).occurrences += 1;
      } else {
        track.track.album.occurrences = 1;
        albums.set(track.track.album.id, track.track.album);
      }

      for (let artist of track.track.artists) {
        if (artists.has(artist.id)) {
          artists.get(artist.id).occurrences += 1;
        } else {
          artist.occurrences = 1;
          artists.set(artist.id, artist);
        }
      }
    }
  }
  return {
    profile,
    tracks,
    artists,
    albums,
  };
}



function occurrenceSort(a: any, b: any): number {
  return a.occurrences - b.occurrences;
}

/******************************************************************************
****** Main
******************************************************************************/


async function main() {
  let username = undefined;
  let mode = Modes.TopArtists;
  let filters: Filter[] = [];
  let filter: Filter["filter"]|null = null;

  for (let arg of Deno.args) {
    if (filter) {
      filters.push({
        'filter': filter,
        'data': arg,
      });
      filter = null;
      continue;
    }
    switch(arg) {
      case '-a':
      case '--albums':
      mode = Modes.TopAlbums;
      break;

      case '-A':
      case '--artists':
      mode = Modes.TopArtists;
      break;

      case '-t':
      case '--tracks':
      mode = Modes.TopTracks;
      break;

      case '-r':
      case '--raw':
      mode = Modes.Raw;
      break;
      case '-fa':

      case '--filter-album':
      filter = (value, data) => value.album.name === data;
      break;

      case '-fA':
      case '--filter-artist':
      filter = (value, data) => {
        for (let artist of value.artists) {
          if (artist.name !== data) return false;
        }
        return true;
      };
      break;

      case '-h':
      case '--help':
      return `${USAGE}\n${HELP}`;

      default:
        username = arg;
      break;
    }
  }

  if (username === undefined) {
    console.error('You must provide a username');
    return USAGE;
  }
  if (Deno.env.get('API_KEY') === undefined) {
    console.error('You must provide an api key in the API_KEY env var');
    return USAGE;
  }

  console.error(`Looking up ${username}...`);
  const p = await profile(username, filters);
  if (mode === Modes.Raw) return JSON.stringify(profile);

  let data = Array.from(p[mode].values()).sort(occurrenceSort);

  return data.map(v => `${v.occurrences}\t${v.name}`).join('\n');
}

if (import.meta.main) {
  main().then(console.log, console.error);
}
