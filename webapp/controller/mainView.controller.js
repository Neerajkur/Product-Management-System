sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library"
], function (Controller, JSONModel, MessageToast, Filter, FilterOperator, Sorter ,Spreadsheet, exportLibrary,) {
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
                    },
                    error: function (oError) {
                        console.log("Error:", oError.message);
                    }
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

        // Open Add Employee Dialog
        onAddEmployee: function () {
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
            var sName = sap.ui.getCore().byId("idNewName").getValue();
            var sPrice = sap.ui.getCore().byId("idNewUnitPrice").getValue();
            var sStock = sap.ui.getCore().byId("idNewUnitStock").getValue();
            var sStatus = sap.ui.getCore().byId("idNewStatus").getValue();

            var oModel = this.getOwnerComponent().getModel();
            var aProducts = oModel.getProperty("/Products");

            // Generate new id
            // var iMaxId = 0;
            // for (var i = 0; i < aEmployees.length; i++) {
            //     var iCurrentId = parseInt(aEmployees[i].id.substring(1));
            //     if (iCurrentId > iMaxId) {
            //         iMaxId = iCurrentId;
            //     }
            // }
            // var sNewId = "E0" + (iMaxId + 1 < 10 ? "0" : "") + (iMaxId + 1);

            var oNewProduct = {
                ProductID: sID,
                ProductName: sName,
                UnitPrice: sPrice,
                UnitsInStock: sStock,
                Discontinued: sStatus

            }
            // aProducts.push(oNewProduct);
            // oModel.setProperty("/Products", aProducts);

            oModel.create("/Products", oNewProduct, {
                success: function () {
                    sap.m.MessageToast.show("Product " + sID + " added successfully!");
                },
                error: function (oError) {
                    sap.m.MessageToast.show("Error adding product");
                    console.log(oError);
                }
            });


            sap.ui.getCore().byId("idNewID").setValue("");
            sap.ui.getCore().byId("idNewName").setValue("");
            sap.ui.getCore().byId("idNewUnitPrice").setValue("");
            sap.ui.getCore().byId("idNewUnitStock").setValue("");
            sap.ui.getCore().byId("idNewStatus").setValue("");

            this._oDialog.close();
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

        // Filter by department
        onFilter: function (oEvent) {
            var sKey = oEvent.getSource().getSelectedKey();
            var oTable = this.byId("employeeTable");
            var oBinding = oTable.getBinding("items");

            if (sKey === "ALL") {
                oBinding.filter([]);
            } else {
                var oFilter = new Filter("department", FilterOperator.EQ, sKey);
                oBinding.filter([oFilter]);
            }
        },

        // Sort table
        onSort: function (oEvent) {
            var sKey = oEvent.getSource().getSelectedKey();
            var oTable = this.byId("employeeTable");
            var oBinding = oTable.getBinding("items");

            switch (sKey) {
                case "nameAsc":
                    oBinding.sort(new Sorter("name", false));
                    break;
                case "nameDesc":
                    oBinding.sort(new Sorter("name", true));
                    break;
                case "salaryAsc":
                    oBinding.sort(new Sorter("salary", false));
                    break;
                case "salaryDesc":
                    oBinding.sort(new Sorter("salary", true));
                    break;
                default:
                    oBinding.sort([]);
                    break;
            }
        },

        onExportSelected: function(){
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
                { label: "Product ID",      property: "ProductID",     type: EdmType.String },
                { label: "Product Name",    property: "ProductName",   type: EdmType.String },
                { label: "Unit Price",      property: "UnitPrice",    type: EdmType.String },
                { label: "Units In Stock",  property: "UnitsInStock", type: EdmType.String },
                { label: "Unit On Order",    property: "UnitsOnOrder", type: EdmType.String },
                { label: "Discontinued",     property: "Discontinued", type: EdmType.String }
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

        }

    });
});