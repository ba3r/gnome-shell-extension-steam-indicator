const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;
const Soup = imports.gi.Soup;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

const _execute = Util.spawnCommandLine;

/**
 * Simple API for local Steam client
 */
const Client = {
    Name: 'Client',

    launch: function(hidden) {
        let silent = hidden ? '-silent' : '';
        _execute('steam %s'.format(silent));
    },

    shutdown: function() {
        _execute('steam -silent -shutdown');
    },

    restart: function() {
        this.shutdown();
        this.launch();
    },

    open: function(path, focus) {
        _execute('steam steam://%s'.format(path));

        if (focus) {
            // wait 1 sec for Steam to finish opening
            Mainloop.timeout_add_seconds(1, function() {
                // activate main window
                _raiseWindow(/^Steam$/);
            });
        }
    },

    runGame: function(gameID) {
        _execute('steam steam://run/%s'.format(gameID));
    },

    library: function() {this.open('open/games', true)},
    profile: function() {this.open('url/SteamIDMyProfile', true)},
    store: {
        featured: function() {this.open('store/', true)},
        explore: function() {this.open('url/StoreExplore', true)},
        curators: function() {this.open('url/StoreCurators', true)},
        news: function() {this.open('open/news', true)},
        stats: function() {this.open('url/StoreStats', true)},
        account: function() {this.open('url/StoreAccount', true)},
    },
    community: {
        home: function() {this.open('url/CommunityHome/', true)},
        discussion: function() {this.open('url/SteamDiscussions', true)},
        workshop: function() {this.open('url/SteamWorkshop', true)},
        greenlight: function() {this.open('uurl/SteamGreenlight', true)},
        market: function() {this.open('url/CommunityMarket', true)},
    },

    activateProduct: function() {this.open('open/activateproduct')},
    activity: function() {this.open('url/SteamIDFriendsPage', true)},
    friends: function() {this.open('open/friends')},
    groups: function() {this.open('url/LeaveGroupPage', true)},
    inventory: function() {this.open('open/inventory', true)},
    screenshots: function() {this.open('open/screenshots')},
    servers: function() {this.open('open/servers')},
    tools: function() {this.open('open/tools', true)},
    downloads: function() {this.open('open/downloads', true)},
    settings: function() {this.open('settings/')},
    bigPicture: function() {this.open('open/bigpicture')},
    steamVR: function() {this.open('run/250820')},
}


// activate the first window that matches the @titlePattern
function _raiseWindow(titlePattern) {
    Main.activateWindow(global.get_window_actors().filter(function(actor) {
        return titlePattern.test(actor.get_meta_window().get_title());
    })[0].get_meta_window());
}


/**
 * API for Steam profile
 */
const Profile = {
    Name: 'Profile',

    /*_init: function() {
        this._settings = Lib.getSettings();

        this.apiKey = _settings.get_string('api-key');
        this.vanityUrl = _settings.get_string('vanity-url');
        this.steamID = _settings.get_string('steam-id');

        this.player = this.getPlayer();
        this.name = this.player.personaname;
        this.status = this.getStatus();
        this.recentGames = this.getRecentGames();
    },*/

    getSteamID: function(vanityUrl) {
        let steamID = "";
        let url = 'http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/';
        let params = {
            key: this.apiKey,
            vanityurl: vanityUrl,
            format: 'json'
        };
        _httpRequest('GET', url, params, Lang.bind(this, function(json) {
            steamID = json.response.steamid;
            _settings.set_string('steam-id', steamID);
        }));
        return steamID;
    },

    getPlayer: function() {
        let url = 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/';
        let params = {
            key: this.apiKey,
            steamids: this.steamID,
            format: 'json'
        };
        _httpRequest('GET', url, params, Lang.bind(this, function(json) {
            this.player = json.response.players[0];
        }));
    },

    getStatus: function() {
        // lookup player first
        if (this.player === null){
            this.getPlayer();
        }

        // convert statusCode (0-6) to corresponding string
        let statusStrings = [
            'offline', 'online', 'busy', 'away', 'snooze', 'trade', 'play'];
        let statusCode = parseInt(this.player.personastate);
        this.status = statusStrings[statusCode];
    },

    setStatus: function(status) {
        Client.open('friends/status/%s'.format(status));
    },

    getRecentGames: function(count) {
        let url = 'http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/';
        let params = {
            key: this.apiKey,
            steamid: this.steamID,
            count: count,
            format: 'json'
        };
        _httpRequest('GET', url, params, Lang.bind(this, function(json) {
            this.recentGames = json.response.games;
        }));
    },
};

// @verb, e.g. 'GET'
// @callback gets called with JSON response
function _httpRequest(verb, url, params, callback) {
    let _httpSession = new Soup.Session();
    let message = Soup.form_request_new_from_hash(verb, url, params);

    _httpSession.queue_message(message, Lang.bind(this,
        function (_httpSession, message) {
            if (message.status_code !== 200)
                return;
            let json = JSON.parse(message.response_body.data);
            callback(json);
        })
    );
}


const MusicPlayer = new Lang.Class({
    Name: 'MusicPlayer',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function() {
        this.parent({ reactive: false });
        this.box = new St.BoxLayout({ style_class: 'music-player' });
        this.actor.add(this.box, { expand: true, x_fill: false, x_align: St.Align.MIDDLE });

        this.isPlaying = false;
        this.playIcon = new St.Icon({icon_name: 'media-playback-start-symbolic'});
        this.pauseIcon = new St.Icon({icon_name: 'media-playback-pause-symbolic'});

        this.prevButton = new St.Button({
            style_class: 'system-menu-action music-player-button',
            child: new St.Icon({icon_name: 'media-skip-backward-symbolic'})
        });
        this.prevButton.connect('clicked', Lang.bind(this, this.previous));
        this.box.add_actor(this.prevButton);

        this.playButton = new St.Button({
            style_class: 'system-menu-action music-player-button',
            child: this.playIcon
        });
        this.playButton.connect('clicked', Lang.bind(this, this.playPause));
        this.box.add_actor(this.playButton);

        this.nextButton = new St.Button({
            style_class: 'system-menu-action music-player-button',
            child: new St.Icon({icon_name: 'media-skip-forward-symbolic'})
        });
        this.nextButton.connect('clicked', Lang.bind(this, this.next));
        this.box.add_actor(this.nextButton);
    },

    playPause: function() {
        let volumectrl = Me.dir.get_path() + "/volumectrl";
        if (!this.isPlaying) {
            Client.open('musicplayer/play', false);
            this.playButton.child = this.pauseIcon;
            this.isPlaying = true;
        } else {
            // mute Steam immediately
            _execute(volumectrl + " -m Steam");
            // because pausing takes a moment
            Client.open('musicplayer/pause', false);
            // un-mute after that
            Mainloop.timeout_add_seconds(2, function() {
                _execute(volumectrl + " -u Steam");
            });
            this.playButton.child = this.playIcon;
            this.isPlaying = false;
        }
    },

    previous: function() {
        Client.open('musicplayer/playprevious', false);
        Client.open('musicplayer/playprevious', false);
    },

    next: function() {
        Client.open('musicplayer/playnext', false);
    },
});

// change volume: pactl set-sink-input-volume 5 0.1 [sink number, %]
// toggle mute: pactl set-sink-input-mute 5 toggle
