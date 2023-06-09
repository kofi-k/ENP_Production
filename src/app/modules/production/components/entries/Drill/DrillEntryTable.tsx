import { Tabs, TabsProps } from "antd";
import { DrillEntry } from "./DrillEntry";
import { DrillEntryAnalysis } from "../../../../../pages/dashboard/Devexpress";


const DrillEntryTable = () => {

    const onTabsChange = (key: string) => {
        console.log(key);
    };
    const tabItems: TabsProps['items'] = [
        {
            key: '1', label: `Drill Enry`,
            children: (
                <>
                    <DrillEntry />
                </>
            ),
        },
        {
            key: '2', label: `Analysis`,
            children: (
                <>
                    <DrillEntryAnalysis />
                </>
            ),
        },
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

export { DrillEntryTable };
