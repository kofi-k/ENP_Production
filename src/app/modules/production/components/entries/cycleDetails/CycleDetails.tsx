import { Tabs, TabsProps } from "antd";
import { CycleDetailsTable } from "./CycleDetailsTable";
import { CycleDetailsAnalysis } from "../../../../../pages/dashboard/Devexpress";


const CycleDetails = () => {
    const onTabsChange = (key: string) => {
    };
    const tabItems: TabsProps['items'] = [
        {
            key: '1', label: `Cycle Details`,
            children: (
                <>
                  <CycleDetailsTable />
                </>
            ),
        },
        {
            key: '2', label: `Analysis`,
            children: (
                <>
                    <CycleDetailsAnalysis />
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
}

export { CycleDetails }