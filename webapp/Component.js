sap.ui.define([
    "sap/ui/core/UIComponent",
    "empms/model/models",
     "sap/ui/model/json/JSONModel",
], (UIComponent, models, JSONModel) => {
    "use strict";

    return UIComponent.extend("empms.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

             var oLocalModel = new JSONModel({
                Products: []
            });
            oLocalModel.setDefaultBindingMode("TwoWay");
            this.setModel(oLocalModel, "local");

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        }
    });
});