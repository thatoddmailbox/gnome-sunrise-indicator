const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Soup = imports.gi.Soup;

// TODO: make this configurable somehow?
const currentLocation = {
    latitude: "42.378385",
    longitude: "-71.147929"
};
const iconSunset = "daytime-sunset-symbolic";
const iconSunrise = "daytime-sunrise-symbolic";

const sessionSync = new Soup.SessionSync();

let text, button;
let statusIcon;
let statusLabel;

function updateData() {
    const msg = Soup.Message.new("GET", "https://api.sunrise-sunset.org/json?lat=" + currentLocation.latitude + "&lng=" + currentLocation.longitude + "&formatted=0");
    sessionSync.queue_message(msg, (session, msg) => {
        const apiData = JSON.parse(msg.response_body.data);
        const sunset = new Date(apiData.results.sunset);
        const sunrise = new Date(apiData.results.sunrise);
        log("msg", msg.response_body.data);
        log("sunset", sunset);
        log("sunrise", sunrise);
        statusLabel.set_text(sunset.toLocaleTimeString());
        statusIcon.set_icon_name(iconSunset);
    });
}

function _hideHello() {
    Main.uiGroup.remove_actor(text);
    text = null;
}

function _showHello() {
    log("_showHello");
    updateData();

    if (!text) {
        text = new St.Label({ style_class: 'helloworld-label', text: "Hello, world!" });
        Main.uiGroup.add_actor(text);
    }

    text.opacity = 255;

    let monitor = Main.layoutManager.primaryMonitor;

    text.set_position(monitor.x + Math.floor(monitor.width / 2 - text.width / 2),
                      monitor.y + Math.floor(monitor.height / 2 - text.height / 2));

    Tweener.addTween(text,
                     { opacity: 0,
                       time: 2,
                       transition: 'easeOutQuad',
                       onComplete: _hideHello });
}

function init() {
    button = new St.Bin({
        style_class: 'panel-button',
        reactive: true,
        can_focus: true,
        x_fill: true,
        y_fill: false,
        track_hover: true
    });
    let buttonContainer = new St.BoxLayout();

    statusIcon = new St.Icon({
        icon_name: iconSunrise,
        style_class: "system-status-icon"
    });
    buttonContainer.add_child(statusIcon);

    statusLabel = new St.Label({
        text: "Hello, world!"
    });
    buttonContainer.add_child(statusLabel);

    button.set_child(buttonContainer);
    button.connect("button-press-event", _showHello);
}

function enable() {
    Main.panel._rightBox.insert_child_at_index(button, 0);
}

function disable() {
    Main.panel._rightBox.remove_child(button);
}
