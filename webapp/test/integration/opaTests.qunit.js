/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["empms/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
