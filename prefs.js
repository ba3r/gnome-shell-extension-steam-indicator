const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
//const Config = imports.misc.config;
//const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;

const Gettext = imports.gettext.domain('steam-indicator');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

function init() {
    Lib.initTranslations();
}

const SteamIndicatorSettings = new GObject.Class({
    Name: 'SteamIndicatorPrefs',
    Extends: Gtk.Grid,

    _init: function(params) {

        this.parent(params);
        this.margin = 24;
        this.spacing = 30;
        this.row_spacing = 10;
        this._settings = Lib.getSettings();

        let label = null
        let widget = null;
        let value = null;

        // Steam ID
        label = new Gtk.Label({
            label: _('Steam ID <small>(Enter your <a href=\'steam://url/SteamIDMyProfile\' title=\'Either one works:&#13;http:\/\/steamcommunity.com\/profiles\/7656119xxxxxxxxxx &#13;http:\/\/steamcommunity.com\/id\/custom_name\'>public profile URL</a> and hit <tt>Enter</tt>)</small>'),
            useMarkup: true,
            trackVisitedLinks: false,
            hexpand: true,
            halign: Gtk.Align.START
        });
        widget = new Gtk.Entry({halign: Gtk.Align.END});
        widget.set_text(this._settings.get_string('steam-id'));

        // Reset Progress Bar
        let resetProgress = function(w) {w.set_progress_fraction(0.0);}
        widget.connect('move-cursor', resetProgress);
        widget.connect('backspace', resetProgress);
        widget.connect('delete-from-cursor', resetProgress);

        // Fill in Steam Profile ID on `Enter`
        widget.connect('activate', Lang.bind(this, function(w) {
            resetProgress(w);
            value = w.get_text().trim();
            this.steamIDWidget = w; // temp reference

            // case 1: http://steamcommunity.com/profiles/76561198000532251
            let idPattern = /steamcommunity\.com\/profiles\/(\d+)/i;
            // case 2: http://steamcommunity.com/id/synapsos
            let vanityPattern = /steamcommunity\.com\/id\/(\w+)/i;

            if (idPattern.test(value)) { // case 1
                steamID = value.match(idPattern)[1];
                this.setSteamID(steamID);
            }
            else if (vanityPattern.test(value)) { // case 2
                let vanity = value.match(vanityPattern)[1];
                w.set_progress_fraction(0.5);
                this.findSteamID(vanity);
            }
            else {
                w.set_text(_('Not a valid profile link'));
                w.select_region(0,-1);
            }
        }));

        this.attach(label, 0, 1, 1, 1);
        this.attach(widget, 1, 1, 1, 1);

        // Steam Web API Key
        label = new Gtk.Label({
            label: _('Steam Web API Key <small>(optional: Get your own key <a href=\'http://steamcommunity.com/dev/apikey\'>here</a>)</small>'),
            useMarkup: true,
            trackVisitedLinks: false,
            hexpand: true,
            halign: Gtk.Align.START
        });
        widget = new Gtk.Entry({halign: Gtk.Align.END});
        widget.set_text(this._settings.get_string('api-key'));
        widget.connect('activate', Lang.bind(this, function(w) {
            value = w.get_text();
            this._settings.set_string('api-key', value);
        }));
        this.attach(label, 0, 2, 1, 1);
        this.attach(widget, 1, 2, 1, 1);

        // Visible menu items
        label = new Gtk.Label({
            label: _('Visible Menu items'),
            hexpand: true,
            halign: Gtk.Align.START
        });
        widget = new Gtk.Entry({halign: Gtk.Align.END});
        widget.set_text(this._settings.get_string('menu-items'));
        widget.connect('activate', Lang.bind(this, function(w) {
            value = w.get_text();
            this._settings.set_string('menu-items', value);
        }));
        this.attach(label, 0, 3, 1, 1);
        this.attach(widget, 1, 3, 1, 1);
    },

    findSteamID: function(vanityUrl) {
        let steamID = "";
        let url = 'http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/';
        let params = {
            key: this._settings.get_string('api-key'),
            vanityurl: vanityUrl,
            format: 'json'
        };
        //this._httpRequest('GET', url, params, Lang.bind(this, function(json) {
        Lib.httpRequest('GET', url, params, Lang.bind(this, function(json) {
            if (json.response.success == 1) {
                this.setSteamID(json.response.steamid);
            } else {
                this.steamIDWidget.set_text(json.response.message);
                this.steamIDWidget.select_region(0,-1);
            }
        }));
    },

    setSteamID: function(steamID) {
        this._settings.set_string('steam-id', steamID);
        this.steamIDWidget.set_text(steamID);
        this.steamIDWidget.set_progress_fraction(1.0);
    },

});

function buildPrefsWidget() {
    let widget = new SteamIndicatorSettings();
    widget.show_all();

    return widget;
}
