const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const St = imports.gi.St;
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

let loadInProgress = false;

let updateTimerID = null;

/**
 * The time that's currently on display in the top bar.
 * @type {Date | null}
*/
let displayedTime = null;

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

function handleError(error) {
	log("handleError called!");

	let e = error;
	if (Object.prototype.toString.call(e) != "[object Error]") {
		e = new Error(error);
	}
	logError(e, "Sunrise Indicator");

	statusLabel.set_text("Error");
	statusIcon.set_icon_name(iconSunrise);
	displayedTime = null;
	loadInProgress = false;
}

/**
 * Fetch the latest sunrise/sunset data.
 * @param {boolean} doTomorrow If we're requesting data for tomorrow (because we found out that we're past sunset for today)
 * @param {boolean} silent If true, hides the fact that we're loading.
 */
function updateData(doTomorrow, silent) {
	loadInProgress = true;

	if (!silent) {
		statusLabel.set_text("Loading...");
	}

	const now = new Date();
	if (doTomorrow) {
		now.setDate(now.getDate() + 1);
	}
	const dateString =
		now.getFullYear() + "-" +
		(now.getMonth() + 1).toString().padStart(2, "0") + "-" +
		now.getDate().toString().padStart(2, "0");

	try {
		const msg = Soup.Message.new("GET", "https://api.sunrise-sunset.org/json?lat=" + currentLocation.latitude + "&lng=" + currentLocation.longitude + "&date=" + dateString + "&formatted=0");
		sessionSync.queue_message(msg, (session, msg) => {
			try {
				const apiData = JSON.parse(msg.response_body.data);
				const sunrise = new Date(apiData.results.sunrise);
				const sunset = new Date(apiData.results.sunset);

				const now = new Date();

				if (now < sunrise) {
					// the sun has not risen yet
					// show the upcoming sunrise time
					statusLabel.set_text(formatTimeString(sunrise));
					statusIcon.set_icon_name(iconSunrise);
					displayedTime = sunrise;
				} else if (now < sunset) {
					// the sun has not set yet
					// show the upcoming sunset time
					statusLabel.set_text(formatTimeString(sunset));
					statusIcon.set_icon_name(iconSunset);
					displayedTime = sunset;
				} else if (!doTomorrow) {
					// the sun has set for today
					// we need to request tomorrow's sunrise
					updateData(true, silent);
					return;
				} else {
					// something weird has happened
					// (we requested data for tomorrow, but somehow that sunset is still in the past??)
					handleError("information for tomorrow is already in the past?");
				}

				loadInProgress = false;
			} catch (e) {
				handleError(e);
			}
		});
	} catch (e) {
		handleError(e);
	}
}

function handleButtonClick() {
	if (loadInProgress) {
		// don't try loading stuff while we're already loading something
		return;
	}

	updateData(false, false);
}

function handleTimer() {
	if (loadInProgress) {
		// don't try loading stuff while we're already loading something
		return;
	}

	const now = new Date();

	let needsUpdate = false;
	if (displayedTime == null) {
		// we currently are showing nothing or an error
		needsUpdate = true;
	} else if (now > displayedTime) {
		// the current time is past what we're displaying
		needsUpdate = true;
	}

	if (needsUpdate) {
		updateData(false, true);
	}
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

	// schedule update timer for every 10 minutes
	updateTimerID = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10 * 60, () => {
		handleTimer();

		return GLib.SOURCE_CONTINUE;
	});
}

function disable() {
	Main.panel._rightBox.remove_child(button);

	if (updateTimerID) {
		GLib.Source.remove(updateTimerID);
		updateTimerID = null;
	}
}
