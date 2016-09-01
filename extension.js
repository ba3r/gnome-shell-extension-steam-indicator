const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;

const Gettext = imports.gettext.domain('steam-indicator');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;


const SteamIndicator = new Lang.Class({
    Name: 'SteamIndicator',
    Extends: PanelMenu.Button,

    _init: function () {
        this.parent(0.0, "Steam Indicator", false);
        let icon = new St.Icon({ icon_name: 'steam_tray_mono',
                                 style_class: 'system-status-icon steam-icon' });
        this.actor.add_actor(icon);
        
        // Recent Games
        this.gamesMenu = new PopupMenu.PopupSubMenuMenuItem(_('Games'));
        this.addQuickAction(_('Library'), 'applications-games-symbolic', 'open/games', this.gamesMenu, 1);
        
        let gamesItems = [
            {name: 'Hexcells Plus', url: 'rungameid/271900'},
            {name: 'Prison Architect', url: 'rungameid/233450'},
            {name: 'Distance', url: 'rungameid/233610'}
        ];
        
        this._addMenuItems(gamesItems, this.gamesMenu);
        this.menu.addMenuItem(this.gamesMenu);
        
        // Status
        this.statusMenu = new PopupMenu.PopupSubMenuMenuItem(_('Profile'));
        this.addQuickAction(_('Profile'), 'avatar-default-symbolic', 'url/SteamIDMyProfile', this.statusMenu, 1);
        
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
        
        // Store
        this.storeMenu = new PopupMenu.PopupSubMenuMenuItem(_('Store'));
        this.addQuickAction(_('Store'), 'steam_tray_mono', 'store/', this.storeMenu, 1);
        
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
        this.addQuickAction(_('Community'), 'system-users-symbolic', 'url/CommunityHome/', this.communityMenu, 1);
        
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
        this.addQuickAction(_('Browse Music'), 'folder-music-symbolic', 'open/music', this.musicMenu, 1);
        
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
            {name: _('Groups'), url: 'url/LeaveGroupPage', focus: true},
            {name: _('Downloads'), url: 'open/downloads', focus: true},
            {name: _('Tools'), url: 'open/tools', focus: true},
            {name: _('Servers'), url: 'open/servers', focus: true},
            {name: _('Screenshots'), url: 'open/screenshots'},
            {name: _('Inventory'), url: 'open/inventory', focus: true},
            {name: _('Settings'), url: 'settings/'}, // subcommands!
            {name: _('Big Picture'), url: 'open/bigpicture'},
            {name: _('Friends'), url: 'open/friends'},
            {name: _('SteamVR'), url: 'run/250820'},
            {name: _('Exit Steam'), cmd: 'steam -shutdown'},
        ];
        
        this._addMenuItems(mainItems, this);
    },
    
    _addMenuItems: function(items, parent) {
    
        items.forEach(Lang.bind(this, function(item) {
        
            let itemAdd = new PopupMenu.PopupBaseMenuItem();
            itemAdd.actor.add_child(new St.Label({text: item.name}));
            parent.menu.addMenuItem(itemAdd);
            
            itemAdd.connect('activate', Lang.bind(this, function() {
                if (item.url && item.url !== null) {
                    openSteamUrl(item.url, item.focus);
                } else if (item.cmd && item.cmd !== null) {
                    Util.spawnCommandLine(item.cmd);
                }
            }));
        }));
    },
    
    addQuickAction: function(name, iconName, url, parent, pos) {
        let icon = new St.Icon({icon_name: iconName, style_class: 'menu-icon'});
        let button = new St.Button({child: icon,
                                    label: name,
                                    style_class: 'system-menu-action quick-action'});
        button.connect('clicked', function() {
            openSteamUrl(url, true);
        });
        parent.actor.insert_child_at_index(button, pos);
    },
});

const MusicPlayer = new Lang.Class({
    Name: 'Musicplayer',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function() {
        this.parent({reactive: false});
        this.box = new St.BoxLayout({style_class: 'controls'});
        this.actor.add(this.box, {expand: false, x_fill: false, x_align: St.Align.MIDDLE});
        
        this.addButton('media-skip-backward', 'musicplayer/playprevious', 2); // done 2x
        this.addButton('media-playback-start', 'musicplayer/toggleplaypause', 1);
        this.addButton('media-skip-forward', 'musicplayer/playnext', 1);
        //this.addButton('media-playlist-shuffle', 'musicplayer/toggleplayingshuffled', 1);
    },
    
    addButton: function(iconName, url, n) {
        let icon = new St.Icon({
            icon_name: iconName + '-symbolic',
        });
        let button = new St.Button({style_class: 'system-menu-action music-player-button',
                                    child: icon});
        button.connect('clicked', function() {
            for (let i = 0; i < n; i++) {
                openSteamUrl(url, false);
            }
        });
        this.box.add_actor(button);
    }
});

function openSteamUrl(url, focus) {
    try {
        Gtk.show_uri(null, 'steam://'+url, global.get_current_time());
        
    } catch (err) {
        let title = "Cannot open steam://%s".format(url);
        Main.notifyError(title, err.message);
    }
    if (focus) {
        activateWindow(/^Steam/);
    }
}

function activateWindow(titlePattern) {
    try {
        Main.activateWindow(global.get_window_actors().filter(function(actor) {
            return titlePattern.test(actor.get_meta_window().get_title());
        })[0].get_meta_window());
        
    } catch (err) {
        let title = "Cannot activate %s".format(url);
        Main.notifyError(title, err.message);
    }
}

function readFile(filename) {
    let input_file = Gio.file_new_for_path(filename);
    let size = input_file.query_info("standard::size", Gio.FileQueryInfoFlags.NONE, null).get_size();
    let stream = input_file.open_readwrite(null).get_input_stream();
    let data = stream.read_bytes(size, null).get_data();
    stream.close(null);
    return data;
}

let indicator;

function init() {
    Convenience.initTranslations();
}

function enable() {
    indicator = new SteamIndicator();
    Main.panel.addToStatusArea('steam-indicator', indicator);
}

function disable() {
    indicator.destroy();
}
