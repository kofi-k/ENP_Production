import { Tabs, TabsProps } from "antd";
import { LoaderOperator } from "./LoaderOperator";
import { LoaderUnit } from "./LoaderUnit";



const ProductionLoader = () => {

    const onTabsChange = (key: string) => {
        console.log(key);
    };
    const tabItems: TabsProps['items'] = [
        {
            key: '1', label: `Unit`,
            children: (
                <>
                   <LoaderUnit />
                </>
            ),
        },
        {
            key: '2', label: `Operator`,
            children: (
                <>
                    <LoaderOperator />
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

export { ProductionLoader };

