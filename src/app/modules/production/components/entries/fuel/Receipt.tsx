import { useState } from "react";
import { useQuery } from "react-query";
import * as XLSX from 'xlsx';
import { fetchDocument } from "../../../urls";
import { convertExcelDateToJSDate } from "../../CommonComponents";
import { FuelComponent } from "./FuelComponent";



const FuelReceipt = () => {
    return (
        <FuelComponent
            title='Fuel Receipt'
            url='ProFuelReceipt'
        />
    )
};

export { FuelReceipt };

