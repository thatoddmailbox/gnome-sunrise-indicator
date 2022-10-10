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

let button;
let statusIcon;
let statusLabel;

/**
 * Formats a time as a string to be displayed in the top bar.
 * @param {Date} time The time to format.
 */
function formatTimeString(time) {
    const isPM = time.getHours() >= 12;
    let hour12 = (time.getHours() % 12);
    if (hour12 == 0) {
        hour12 = 12;
    }

    return hour12 + ":" + time.getMinutes().toString().padStart(2, "0") + " " + (isPM ? "PM" : "AM");
}

/**
 * Fetch the latest sunrise/sunset data.
 * @param {boolean} doTomorrow If we're requesting data for tomorrow (because we found out that we're past sunset for today)
 */
function updateData(doTomorrow) {
    statusLabel.set_text("Loading...");

    const now = new Date();
    if (doTomorrow) {
        now.setDate(now.getDate() + 1);
    }
    const dateString =
        now.getFullYear() + "-" +
        (now.getMonth() + 1).toString().padStart(2, "0") + "-" +
        now.getDate().toString().padStart(2, "0");

    const msg = Soup.Message.new("GET", "https://api.sunrise-sunset.org/json?lat=" + currentLocation.latitude + "&lng=" + currentLocation.longitude + "&date=" + dateString + "&formatted=0");
    sessionSync.queue_message(msg, (session, msg) => {
        const apiData = JSON.parse(msg.response_body.data);
        const sunrise = new Date(apiData.results.sunrise);
        const sunset = new Date(apiData.results.sunset);

        const now = new Date();

        if (now < sunrise) {
            // the sun has not risen yet
            // show the upcoming sunrise time
            statusLabel.set_text(formatTimeString(sunrise));
            statusIcon.set_icon_name(iconSunrise);
        } else if (now < sunset) {
            // the sun has not set yet
            // show the upcoming sunset time
            statusLabel.set_text(formatTimeString(sunset));
            statusIcon.set_icon_name(iconSunset)
        } else if (!doTomorrow) {
            // the sun has set for today
            // we need to request tomorrow's sunrise
            updateData(true);
        } else {
            // something weird has happened
            // (we requested data for tomorrow, but somehow that sunset is still in the past??)
            statusLabel.set_text("Error");
            statusIcon.set_icon_name(iconSunrise);
        }
    });
}

function handleButtonClick() {
    updateData(false);
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
        text: "Loading..."
    });
    buttonContainer.add_child(statusLabel);

    button.set_child(buttonContainer);
    button.connect("button-press-event", handleButtonClick);

    updateData();
}

function enable() {
    Main.panel._rightBox.insert_child_at_index(button, 0);
}

function disable() {
    Main.panel._rightBox.remove_child(button);
}
