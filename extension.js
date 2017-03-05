const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;
const Soup = imports.gi.Soup;
const Util = imports.misc.util;
const GnomeSession = imports.misc.gnomeSession;

const Gettext = imports.gettext.domain('steam-indicator');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;
const Client = Me.imports.steam.Client;
//const Profile = Me.imports.steam.Profile;
const MusicPlayer = Me.imports.steam.MusicPlayer;


const UUID = Me.uuid;


const SteamIndicator = new Lang.Class({
    Name: 'SteamIndicator',
    Extends: PanelMenu.Button,

    _init: function() {

        this._settings = Lib.getSettings();

        this.parent(0.0, 'Steam Indicator', false);
        let icon = new St.Icon({icon_name: 'steamindicator-symbolic',
                                style_class: 'system-status-icon steam-icon'
        });
        this.actor.add_actor(icon);

        // if no steam-id set yet, open Preferences
        if (this._settings.get_string('steam-id') === "") {
            notify(_('Please set your Steam ID'), _('Preferences'),
                    this.openPreferences);
        }

        //this.buildMenu();

        // Recent Games
        this.gamesMenu = new PopupMenu.PopupSubMenuMenuItem(_('Games'));
        this.addQuickAction(_('Library'), 'applications-games-symbolic', null, 'open/games', this.gamesMenu, 1);

        // Steam API
        this.getRecentlyPlayedGames('10');
        //Mainloop.timeout_add_seconds(2, Lang.bind(this, function() {
        //    this.gamesMenu.menu.removeAll();
        //    this.getRecentlyPlayedGames('10');
        //}));

        this.menu.addMenuItem(this.gamesMenu);

        // Status
        this.statusMenu = new PopupMenu.PopupSubMenuMenuItem(_('Profile'));
        this.addQuickAction(_('Profile'), 'avatar-default-symbolic', null, 'url/SteamIDMyProfile', this.statusMenu, 1);

        let statusItems = [
            {name: _('Online'), url: 'friends/status/online'},
            {name: _('Busy'), url: 'friends/status/busy'},
            {name: _('Away'), url: 'friends/status/away'},
            {name: _('Looking to Play'), url: 'friends/status/play'},
            {name: _('Looking to Trade'), url: 'friends/status/trade'},
            {name: _('Offline'), url: 'friends/status/offline'}
        ];

        this._addMenuItems(statusItems, this.statusMenu);
        this.menu.addMenuItem(this.statusMenu);

        // Detect changes of session status (available, away)
        // TODO: save and restore current Steam status
        // TODO: should only change when Steam is open!
        this._presence = new GnomeSession.Presence();
        this._presence.connectSignal('StatusChanged', Lang.bind(this, function(proxy, senderName, [status]) {
            this._onStatusChanged(status);
        }));

        // Store
        this.storeMenu = new PopupMenu.PopupSubMenuMenuItem(_('Store'));
        this.addQuickAction(_('Store'), 'gnome-software-symbolic', 'steam_tray_mono', 'store/', this.storeMenu, 1);

        let storeItems = [
            {name: _('Featured'), url: 'store/', focus: true},
            {name: _('Explore'), url: 'url/StoreExplore', focus: true},
            {name: _('Curators'), url: 'url/StoreCurators', focus: true},
            {name: _('News'), url: 'open/news', focus: true},
            {name: _('Stats'), url: 'url/StoreStats', focus: true},
            {name: _('Account'), url: 'url/StoreAccount', focus: true},
        ];

        this._addMenuItems(storeItems, this.storeMenu);
        this.menu.addMenuItem(this.storeMenu);

        // Community
        this.communityMenu = new PopupMenu.PopupSubMenuMenuItem(_('Community'));
        this.addQuickAction(_('Community'), 'system-users-symbolic', null, 'url/CommunityHome/', this.communityMenu, 1);

        let communityItems = [
            {name: _('Home'), url: 'url/CommunityHome/', focus: true},
            {name: _('Discussions'), url: 'url/SteamDiscussions', focus: true},
            {name: _('Workshop'), url: 'url/SteamWorkshop', focus: true},
            {name: _('Greenlight'), url: 'url/SteamGreenlight', focus: true},
            {name: _('Market'), url: 'url/CommunityMarket', focus: true},
        ];

        this._addMenuItems(communityItems, this.communityMenu);
        this.menu.addMenuItem(this.communityMenu);

        // Music
        this.musicMenu = new PopupMenu.PopupSubMenuMenuItem(_('Music'));
        this.addQuickAction(_('Browse Music'), 'folder-music-symbolic', null, 'open/music', this.musicMenu, 1);

        this.musicPlayer = new MusicPlayer();
        this.musicMenu.menu.addMenuItem(this.musicPlayer);

        let musicItems = [
            //{name: '+', url: 'musicplayer/increasevolume'},
            //{name: '-', url: 'musicplayer/decreasevolume'},
            {name: _('Shuffle'), url: 'musicplayer/toggleplayingshuffled'},
            {name: _('Music Player'), url: 'open/musicplayer'},
        ];

        this._addMenuItems(musicItems, this.musicMenu);
        this.menu.addMenuItem(this.musicMenu);

        // Main
        let mainItems = [
            //{name: 'Main', url: 'open/main'},
            {name: _('Activate Product'), url: 'open/activateproduct'},
            {name: _('Friend Activity'), url: 'url/SteamIDFriendsPage', focus: true},
            {name: _('Friends'), url: 'open/friends'},
            {name: _('Groups'), url: 'url/LeaveGroupPage', focus: true},
            {name: _('Inventory'), url: 'open/inventory', focus: true},
            {name: _('Screenshots'), url: 'open/screenshots'},
            {name: _('Servers'), url: 'open/servers'},
            {name: _('Tools'), url: 'open/tools', focus: true},
            {name: _('Downloads'), url: 'open/downloads', focus: true},
            {name: _('Settings'), url: 'settings/'}, // subcommands!
            {name: _('Big Picture'), url: 'open/bigpicture'},
            {name: _('SteamVR'), url: 'run/250820'},
            {name: _('Exit Steam'), cmd: 'steam -silent -shutdown'},
            {name: 'Configure menu', cmd: 'gnome-shell-extension-prefs "steam-indicator@baer.space"'},
        ];

        this._addMenuItems(mainItems, this);
    },
    buildMenu: function() {
        let main = Lang.bind(this, function(label, callback) {
            let item = new PopupMenu.PopupBaseMenuItem();
            item.actor.add_child(new St.Label({ text: label }));
            this.menu.addMenuItem(item);
            //item.connect('activate', Lang.bind(this, callback));
        });
        let addItem = {
            //games: function() {},
            //profile: function() {},
            //store: function() {},
            //community: function() {},
            //music: function() {},

            activate: main(_('Activate Product'), Client.activate),
            activity: main(_('Friend Activity'), Client.activity),
            friends: main(_('Friends'), Client.friends),
            groups: main(_('Groups'), Client.groups),
            inventory: main(_('Inventory'), Client.inventory),
            screenshots: main(_('Screenshots'), Client.screenshots),
            servers: main(_('Servers'), Client.servers),
            tools: main(_('Tools'), Client.tools),
            downloads: main(_('Downloads'), Client.downloads),
            settings: main(_('Settings'), Client.settings),
            bigPicture: main(_('Big Picture'), Client.bigPicture),
            steamVR: main(_('SteamVR'), Client.steamVR),

            exit: main(_('Exit Steam'), Client.shutdown),
            restart: main(_('Restart Steam'), Client.restart),
            // maybe add 3 buttons for prefs, (restart,) exit
        };

        let menuItems = JSON.parse(this._settings.get_string('menu-items'));
        for (let item in menuItems) {
            //this.addItem[item].call(this);
        }
    },

    openPreferences: function() {
        if (Me.hasPrefs) {
            Util.spawn(['gnome-shell-extension-prefs', Me.uuid]);
        }
    },

    refreshGames: function() {
        let games = getRecentlyPlayedGames(10);
    },

    getRecentlyPlayedGames: function(count) {
        let url = 'http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/';
        let params = {
            key: '2F5F3035C68A07F1C76FB6EBACBAB888',
            steamid: Lib.getSettings().get_string('steam-id'),
            count: count,
            format: 'json'
        };
        Lib.httpRequest('GET', url, params, Lang.bind(this, function(json) {
            let games = json.response.games;
            games.forEach(Lang.bind(this, function(game) {
                this.addGame(game, this.gamesMenu);
            }));
        }));
    },

    addGame: function(game, parent) {
        let entry = new PopupMenu.PopupBaseMenuItem();
        let shortName =
            game.name.length > 20 ? game.name.substring(0, 20) + '…' : game.name;
        entry.actor.add_child(new St.Label({ text: shortName }));
        parent.menu.addMenuItem(entry);

        entry.connect('activate', Lang.bind(this, function() {
            Client.runGame(game.appid);
            // TODO: move entry to top of parent
        }));
    },

    _addMenuItems: function(items, parent) {

        items.forEach(Lang.bind(this, function(item) {

            let itemAdd = new PopupMenu.PopupBaseMenuItem();
            itemAdd.actor.add_child(new St.Label({ text: item.name }));
            parent.menu.addMenuItem(itemAdd);

            itemAdd.connect('activate', Lang.bind(this, function() {
                if (item.url && item.url !== null) {
                    Client.open(item.url, item.focus);
                } else if (item.cmd && item.cmd !== null) {
                    Util.spawnCommandLine(item.cmd);
                }
            }));
        }));
    },

    addQuickAction: function(name, iconName, fallback, url, parent, pos) {
        fallback = fallback == null ? iconName : fallback;
        let icon = new St.Icon({ icon_name: iconName, fallback_icon_name: fallback, style_class: 'menu-icon' });
        let button = new St.Button({
                child: icon,
                label: name,
                style_class: 'system-menu-action quick-action'
        });
        button.connect('clicked', Lang.bind(this, function(b, mouse, data) {
            Client.open(url, true);
            // TODO close menu
        }));
        parent.actor.insert_child_at_index(button, pos);
    },

    // XXX
    _onStatusChanged: function(status) {
    // AVAILABLE BUSY IDLE INVISIBLE
        switch (status) {
            case GnomeSession.PresenceStatus.AVAILABLE:
                Client.open('friends/status/online', false);
                break;
            case GnomeSession.PresenceStatus.BUSY:
                Client.open('friends/status/busy', false);
                break;
            case GnomeSession.PresenceStatus.IDLE:
                Client.open('friends/status/away', false);
                break;
            case GnomeSession.PresenceStatus.INVISIBLE:
                Client.open('friends/status/offline', false);
                break;
        }
    },
});


function notify(message, action, callback) {
    let source = new MessageTray.Source(_('Steam Indicator'), 'steamindicator-symbolic');
    source.policy = new MessageTray.NotificationPolicy({forceExpanded: true});
    Main.messageTray.add(source);

    let notification = new MessageTray.Notification(source, _('Steam Indicator'), message);
    notification.setUrgency(MessageTray.Urgency.HIGH);
    notification.setTransient(false);
    notification.setResident(false);

    if (action && callback) {
        notification.addAction(action, callback);
        notification.connect('destroy', callback);
    }

    source.notify(notification);
}

function openPreferences() {
    
}

let indicator;

function init(metadata) {
    Lib.initTranslations();

    let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path(metadata.path + "/icons");
}

function enable() {
    indicator = new SteamIndicator();
    Main.panel.addToStatusArea('steam-indicator', indicator);
}

function disable() {
    indicator.destroy();
}
