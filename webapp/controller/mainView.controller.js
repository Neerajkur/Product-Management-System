sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library"
], function (Controller, JSONModel, MessageToast, Filter, FilterOperator, Sorter, Spreadsheet, exportLibrary,) {
    "use strict";
    const EdmType = exportLibrary.EdmType;
    return Controller.extend("empms.controller.mainView", {

        onInit: function () {

            var oLocalModel = this.getOwnerComponent().getModel("local");
            var oDataModel = this.getOwnerComponent().getModel();

            oDataModel.read("/Products", {
                success: function (oData) {
                    oLocalModel.setProperty("/Products", oData.results);
                    console.log("Products loaded:", oData.results);
                    this._calculateKPI();
                }.bind(this),
                error: function (oError) {
                    console.log("Error:", oError.message);
                }
            });

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

        },
        // Navigate to Detail page
        onEmployeePress: function (oEvent) {
            var oItem = oEvent.getSource();
            var sPath = oItem.getBindingContext("local").getPath();
            var oModel = this.getView().getModel("local");
            var oProduct = oModel.getProperty(sPath);

            this.getOwnerComponent().getRouter().navTo("detail", {
                id: oProduct.ProductID
            });
        },


        onAddProduct: function () {
            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment(
                    "empms.fragment.AddEmployee",
                    this
                );
                this.getView().addDependent(this._oDialog);
            }
            this._oDialog.open();
        },

        // Save new employee
        onSaveProduct: function () {
            var sID = sap.ui.getCore().byId("idNewID").getValue();
            var oInput = sap.ui.getCore().byId("idNewName");
            var sName = sap.ui.getCore().byId("idNewName").getValue();
            var sPrice = sap.ui.getCore().byId("idNewUnitPrice").getValue();
            var sStock = sap.ui.getCore().byId("idNewUnitStock").getValue();
            // var sStatus = sap.ui.getCore().byId("idNewStatus").getSelectedKey();\
            var sStatus = this._oDialog.getContent()[0]._aElements.find((element) => { return element.sId === 'idNewStatus' }).getSelectedKey();

            if (!sName || sName.trim() === "") {
                oInput.setValueState("Error");
                oInput.setValueStateText("Product Name is required");
                return;
            }

            oInput.setValueState("None");

            var oModel = this.getOwnerComponent().getModel("local");
            var aProducts = oModel.getProperty("/Products");

            //Generate new id
            var iMaxId = 0;
            for (var i = 0; i < aProducts.length; i++) {
                var iCurrentId = parseInt(aProducts[i].ProductID);
                if (iCurrentId > iMaxId) {
                    iMaxId = iCurrentId;
                }
            }
            var sNewId = (iMaxId + 1);

            var oNewProduct = {
                ProductID: sNewId,
                ProductName: sName,
                UnitPrice: sPrice,
                UnitsInStock: sStock,
                Discontinued: (sStatus === "true")

            }
            aProducts.push(oNewProduct);
            oModel.setProperty("/Products", aProducts);

            // oModel.create("/Products", oNewProduct, {
            //     success: function () {
            //         sap.m.MessageToast.show("Product " + sID + " added successfully!");
            //     },
            //     error: function (oError) {
            //         sap.m.MessageToast.show("Error adding product");
            //         console.log(oError);
            //     }
            // });


            sap.ui.getCore().byId("idNewID").setValue("");
            sap.ui.getCore().byId("idNewName").setValue("");
            sap.ui.getCore().byId("idNewUnitPrice").setValue("");
            sap.ui.getCore().byId("idNewUnitStock").setValue("");
            sap.ui.getCore().byId("idNewStatus").setValue("");

            this._oDialog.close();
            this._calculateKPI();
        },

        // Cancel dialog
        onCancelProduct: function () {
            this._oDialog.close();
        },

        // Search by name
        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oTable = this.byId("ProductTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery) {
                var oFilter = new Filter("ProductName", FilterOperator.Contains, sQuery);
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]);
            }
        },


        onFilter: function (oEvent) {
            var sKey = oEvent.getSource().getSelectedKey();
            var oTable = this.byId("ProductTable");
            var oBinding = oTable.getBinding("items");

            if (sKey === "ALL") {
                oBinding.filter([]);
            } else {
                var bValue = (sKey === "true");
                var oFilter = new Filter("Discontinued", FilterOperator.EQ, bValue);
                oBinding.filter([oFilter]);
            }
        },

        // Sort table
        onSort: function (oEvent) {
            var sKey = oEvent.getSource().getSelectedKey();
            var oTable = this.byId("ProductTable");
            var oBinding = oTable.getBinding("items");

            switch (sKey) {
                case "nameAsc":
                    oBinding.sort(new Sorter("ProductName", false));
                    break;
                case "nameDesc":
                    oBinding.sort(new Sorter("ProductName", true));
                    break;
                case "PriceAsc":
                    oBinding.sort(new Sorter("UnitPrice", false));
                    break;
                case "PriceDesc":
                    oBinding.sort(new Sorter("UnitPrice", true));
                    break;
                default:
                    oBinding.sort(null);
                    break;
            }
        },

        onExportSelected: function () {
            const oTable = this.byId("ProductTable");
            const aSelectedItems = oTable.getSelectedItems();

            // Guard: nothing selected
            if (!aSelectedItems.length) {
                MessageToast.show("Please select at least one row to export.");
                return;
            }

            // Extract raw data from selected ColumnListItems
            const aSelectedData = aSelectedItems.map(function (oItem) {
                return oItem.getBindingContext("local").getObject();
            });

            // Define columns matching your JSON structure
            const aCols = [
                { label: "Product ID", property: "ProductID", type: EdmType.String },
                { label: "Product Name", property: "ProductName", type: EdmType.String },
                { label: "Unit Price", property: "UnitPrice", type: EdmType.String },
                { label: "Units In Stock", property: "UnitsInStock", type: EdmType.String },
                { label: "Unit On Order", property: "UnitsOnOrder", type: EdmType.String },
                { label: "Discontinued", property: "Discontinued", type: EdmType.String }
            ];

            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
                },
                dataSource: aSelectedData,
                fileName: "SelectedExport.xlsx",
                worker: false
            };

            const oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(function () {
                    MessageToast.show("Export successful!");
                })
                .finally(function () {
                    oSheet.destroy();
                });

        },
        onOpenSortDialog: function () {
            if (!this._oSortDialog) {
                this._oSortDialog = new sap.m.ViewSettingsDialog({
                    confirm: this.onSortConfirm.bind(this),
                    reset: this.onSortReset.bind(this),
                    sortItems: [
                        new sap.m.ViewSettingsItem({
                            text: "Product Name",
                            key: "ProductName"
                        }),
                        new sap.m.ViewSettingsItem({
                            text: "Unit Price",
                            key: "UnitPrice"
                        }),
                        new sap.m.ViewSettingsItem({
                            text: "Units In Stock",
                            key: "UnitsInStock"
                        })
                    ]
                });
            }

            this._oSortDialog.open();
        },
        onSortConfirm: function (oEvent) {
            var mParams = oEvent.getParameters();
            var sPath = mParams.sortItem.getKey();
            var bDescending = mParams.sortDescending;

            var oTable = this.byId("ProductTable");
            var oBinding = oTable.getBinding("items");

            if (!mParams.sortItem) {
                oBinding.sort(null);
                return;
            }
            let oSorter;
            if (sPath === "UnitPrice") {

                oSorter = new sap.ui.model.Sorter(sPath, bDescending, false, function (a, b) {
                    return parseFloat(a) - parseFloat(b);
                });

            } else {
                oSorter = new sap.ui.model.Sorter(sPath, bDescending);
            }

            oBinding.sort(oSorter);
        },
        onSortReset: function () {
            var oTable = this.byId("ProductTable");
            var oBinding = oTable.getBinding("items");

            oBinding.sort(null);
        },

        onNumberLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();

            // Allow empty (user still typing)
            if (!sValue) {
                oInput.setValueState("None");
                return;
            }

            // Check if valid number
            if (isNaN(sValue)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Only numeric values allowed");
                return;
            }
        },
        onChartTypeChange: function (oEvent) {
            var sType = oEvent.getSource().getSelectedKey();
            this.byId("idVizFrame").setVizType(sType);
        }

    });
});