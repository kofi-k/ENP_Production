import { Space, Tabs, TabsProps, Tag } from "antd";
import { Link } from "react-router-dom";
import { FuelReceipt } from "./Receipt";
import { FuelIssue } from "./Issue";
import { FuelAnalysis } from "../../../../../pages/dashboard/Devexpress";
import { useAuth } from "../../../../auth";


const EquipmentFuelTable = () => {
    
    const onTabsChange = (key: string) => {
        console.log(key);
    };
    const tabItems: TabsProps['items'] = [
        {
            key: '1', label: `Receipt`,
            children: (
                <>
                    <FuelReceipt />
                </>
            ),
        },
        {
            key: '2', label: `Issue`,
            children: (
                <>
                    <FuelIssue />
                </>
            ),
        },
        {
            key: '3', label: `Analysis`,
            children: (
                <>
                    <FuelAnalysis />
                </>
            ),
        }
    ]

    return (
        <div className='card border border-gray-400 '
            style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '5px',
                boxShadow: '2px 2px 15px rgba(0,0,0,0.08)',
            }}
        >
            <Tabs defaultActiveKey="1"
                type="card"
                items={tabItems}
                onChange={onTabsChange}
            />
        </div>
    )
};

export { EquipmentFuelTable }