sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, History, MessageToast, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("empms.controller.DetailView", {

        onInit: function () {

            var oUIModel = new JSONModel({
                editMode: false
            });
            this.getView().setModel(oUIModel, "ui");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("detail").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sId = oEvent.getParameter("arguments").id;
            var oLocalModel = this.getOwnerComponent().getModel("local");

            var aProducts = oLocalModel.getProperty("/Products");

            if (!aProducts || aProducts.length === 0) {
                // Data not loaded yet — wait for model change
                oLocalModel.attachEventOnce("propertyChange", function () {
                    this._bindProductById(sId);
                }.bind(this));
            } else {
                this._bindProductById(sId);
            }
        },

        _bindProductById: function (sId) {
            var oLocalModel = this.getOwnerComponent().getModel("local");
            var aProducts = oLocalModel.getProperty("/Products");

            var iIndex = aProducts.findIndex(function (oProduct) {
                return String(oProduct.ProductID) === String(sId);
            });

            if (iIndex !== -1) {
                this.getView().bindElement({
                    model: "local",
                    path: "/Products/" + iIndex
                });
                console.log("Bound to product index:", iIndex);
            } else {
                console.warn("Product not found for ID:", sId);
            }
        },

        // _bindEmployee: function (sId) {
        //     var oModel = this.getOwnerComponent().getModel();
        //     var aEmployees = oModel.getProperty("/employees");
        //     var iIndex = -1;

        //     for (var i = 0; i < aEmployees.length; i++) {
        //         if (aEmployees[i].id === sId) {
        //             iIndex = i;
        //             break;
        //         }
        //     }

        //     if (iIndex !== -1) {
        //         this.getView().bindElement("/employees/" + iIndex);
        //     }
        // },

        onEdit: function () {
            var oModel = this.getOwnerComponent().getModel("local");
            var sPath = this.getView().getElementBinding("local").getPath();
            var oProduct = oModel.getProperty(sPath);

             this._oBackupData = Object.assign({}, oProduct);
            this.getView().getModel("ui").setProperty("/editMode", true);
        },

        onSave: function () {
            // var oModel = this.getOwnerComponent().getModel();
            this.getView().getModel("ui").setProperty("/editMode", false);
            MessageToast.show("Saved successfully!");
            this._calculateKPI();
        },

        onCancel: function () {
            var oModel = this.getOwnerComponent().getModel("local");
            var sPath = this.getView().getElementBinding("local").getPath();

            oModel.setProperty(sPath, this._oBackupData);
            
            this.getView().getModel("ui").setProperty("/editMode", false);
        },

        onDelete: function () {
            var oModel = this.getOwnerComponent().getModel("local");
            var sPath = this.getView().getElementBinding("local").getPath();
            var oProduct = oModel.getProperty(sPath);

            MessageBox.confirm(
                "Are you sure you want to delete " + oProduct.ProductName + "?",
                {
                    title: "Delete Product",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            var aProducts = oModel.getProperty("/Products");
                            var iIndex = parseInt(sPath.split("/")[2]);

                            aProducts.splice(iIndex, 1);
                            oModel.setProperty("//Products", aProducts);

                            MessageToast.show(oProduct.Name + " deleted!");
                            this.getOwnerComponent().getRouter().navTo("RoutemainView", {}, true);
                            this._calculateKPI();
                        }
                    }.bind(this)
                }
            );
        },

        onBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
             this.getView().getModel("ui").setProperty("/editMode", false);

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RoutemainView");
            }
        },
        _calculateKPI: function () {
            var oLocalModel = this.getOwnerComponent().getModel("local");
            var aProducts = oLocalModel.getProperty("/Products");

            var iTotal = aProducts.length;

            var totalValue = 0;
            var lowStock = 0;
            var discontinued = 0;

            aProducts.forEach(function (item) {
                totalValue += item.UnitPrice * item.UnitsInStock;

                if (item.UnitsInStock < 10) {
                    lowStock++;
                }

                if (item.Discontinued) {
                    discontinued++;
                }
            });

            oLocalModel.setProperty("/kpi", {
                totalProducts: iTotal,
                totalValue: totalValue,
                lowStock: lowStock,
                discontinued: discontinued
            });

        }


    });
});