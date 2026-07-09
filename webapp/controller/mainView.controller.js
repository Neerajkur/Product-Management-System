sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "sap/m/MessageBox",
    "sap/ui/unified/FileUploader"
], function (Controller, JSONModel, MessageToast, Filter, FilterOperator, Sorter, Spreadsheet, exportLibrary, MessageBox, FileUploader) {
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

        onLowStockPress: function (oEvent) {
            let oTile = oEvent.getSource();
            let otable = this.byId("ProductTable");
            let oBinding = otable.getBinding("items");

            if (this._lowstockFilterActive === true) {
                oBinding.filter([]);
                 oTile.removeStyleClass("selectedTile");
                this._lowstockFilterActive = false;
            } else {
                let oFilter = new Filter("UnitsInStock", FilterOperator.LT, 10);
                oBinding.filter([oFilter]);
                  oTile.addStyleClass("selectedTile");
                this._lowstockFilterActive = true;
            }

        },
         onDiscontinuedPress: function (oEvent) {
            let oTile = oEvent.getSource();
            let otable = this.byId("ProductTable");
            let oBinding = otable.getBinding("items");

            if (this._discontinuedFilterActive === true) {
                oBinding.filter([]);
                 oTile.removeStyleClass("selectedTile");
                this._discontinuedFilterActive = false;
            } else {
                let oFilter = new Filter("Discontinued", FilterOperator.EQ, true);
                oBinding.filter([oFilter]);
                 oTile.addStyleClass("selectedTile");
                this._discontinuedFilterActive = true;
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
        onImportPress: function () {
            if (!this._oImportDialog) {
                this._oImportDialog = sap.ui.xmlfragment(
                    "empms.fragment.ImportDialog",
                    this
                );
                this.getView().addDependent(this._oImportDialog);
            }
            this._oImportDialog.open();
        },

        onCancelImport: function () {
            this._oImportDialog.close();
        },

        onDownloadTemplate: function () {
            let aTemplateData = [{
                ProductID: "1",
                ProductName: "Sample Product",
                UnitPrice: "10.99",
                UnitsInStock: "50",
                UnitsOnOrder: "10",
                Discontinued: "false"
            }];

            let oSheet = XLSX.utils.json_to_sheet(aTemplateData);
            let oWorkbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(oWorkbook, oSheet, "Products");
            XLSX.writeFile(oWorkbook, "ProductTemplate.xlsx");

            MessageToast.show("Template downloaded.");
            this._oImportDialog.close();
        },

        onFileUpload: function (oEvent) {
            // const oFileUploader = this.byId("idfileUploader");
            this._oFileUploader = oEvent.getSource();
            const oFileUploader = oEvent.getSource();
            const oDomRef = oFileUploader.getDomRef();
            const oFileInput = oDomRef.querySelector('input[type="file"]');

            if (!oFileInput || oFileInput.files.length === 0) {
                MessageBox.error("Please select a file.");
                return;
            }

            const oFile = oFileInput.files[0];

            // Guard: must be .xlsx
            if (!oFile.name.endsWith(".xlsx")) {
                MessageBox.error("Please upload a valid .xlsx file.");
                return;
            }
            MessageToast.show("Button Clicked ");

            const reader = new FileReader();

            reader.onload = (e) => {

                var aBinaryData = e.target.result;
                var oWorkbook = XLSX.read(aBinaryData, { type: "binary" });

                var sFirstSheet = oWorkbook.SheetNames[0];
                var oSheet = oWorkbook.Sheets[sFirstSheet];

                var aUploadedData = XLSX.utils.sheet_to_json(oSheet);

                if (!aUploadedData.length) {
                    MessageBox.error("The uploaded file is empty.");
                    return;
                }

                var aRequiredFields = ["ProductID", "ProductName", "UnitPrice", "UnitsInStock", "UnitsOnOrder", "Discontinued"];
                var aFileCols = Object.keys(aUploadedData[0]);

                var aMissing = aRequiredFields.filter(function (col) {
                    return !aFileCols.includes(col);
                });

                if (aMissing.length) {
                    MessageBox.error("Missing required columns: " + aMissing.join(", "));
                    return;
                }

                var aCleanData = aUploadedData.map(function (row) {
                    return {
                        ProductID: String(row.ProductID),
                        ProductName: String(row.ProductName),
                        UnitPrice: parseFloat(row.UnitPrice) || 0,
                        UnitsInStock: parseInt(row.UnitsInStock) || 0,
                        UnitsOnOrder: parseInt(row.UnitsOnOrder) || 0,
                        Discontinued: String(row.Discontinued).toLowerCase() === "true"
                    };
                });

                MessageBox.confirm(
                    " This will append " + aCleanData.length + " new products to the existing list. Do you want to proceed?",
                    {
                        onClose: function (sAction) {
                            if (sAction === MessageBox.Action.OK) {
                                console.log("message box ok clicked");
                                this._applyUploadedData(aCleanData);
                            }
                        }.bind(this)

                    }
                );

            };
            reader.readAsArrayBuffer(oFile);
            this._oFileUploader = oEvent.getSource();
        },

        _applyUploadedData: function (aData) {
            console.log("method called ");
            var oModel = this.getView().getModel("local");
            var aExisting = oModel.getProperty("/Products") || [];
            var aMerged = aExisting.concat(aData);
            oModel.setProperty("/Products", aMerged);
            this._calculateKPI();

            var oTable = this.byId("ProductTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter([]);
            oTable.removeSelections(true);

            //Show success Trip
            // var oStrip = this.byId("idUploadStrip");
            // oStrip.setType("Success");
            // oStrip.setVisible(true);
            // oStrip.setText(aData.length + " products appended successfully from Excel.");


            this._oImportDialog.close();

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
        },
        onMassEditPress: function () {
            let oTable = this.byId("ProductTable");
            let aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                MessageToast.show("Please select at least one product to edit.");
                return;
            }

            let aSelectedData = aSelectedItems.map(oItem => {
                return Object.assign({}, oItem.getBindingContext("local").getObject())
            });

            let oMassEditModel = new JSONModel({ selectedItems: aSelectedData });
            this.getView().setModel(oMassEditModel, "massEdit");


            if (!this._oMassEditDialog) {
                this._oMassEditDialog = sap.ui.xmlfragment(
                    "empms.fragment.MassEdit",
                    this
                );
                this.getView().addDependent(this._oMassEditDialog);
            }
            this._oMassEditDialog.open();
        },
        onMassEditCancel: function () {
            this._oMassEditDialog.close();
        },
        onMassEditSave: function () {
            let aEditedItems = this.getView().getModel("massEdit").getProperty("/selectedItems");
            debugger;
            let oAllProducts = this.getView().getModel("local").getProperty("/Products");

            aEditedItems.forEach(editedItem => {
                let index = oAllProducts.findIndex(product => product.ProductID === editedItem.ProductID);
                if (index !== -1) {
                    oAllProducts[index] = Object.assign({}, editedItem);
                }
            });
            let oMainModel = this.getView().getModel("local");
            oMainModel.setProperty("/Products", oAllProducts);
            oMainModel.refresh(true);
            this._oMassEditDialog.close();

            this.byId("ProductTable").removeSelections(true);
            this._calculateKPI();

        }
    });
});