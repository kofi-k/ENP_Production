import { Button, Divider, Input, Modal, Space, Spin, Table, TableColumnsType, TabsProps, Tag, Upload, UploadFile, UploadProps, message } from 'antd';
import moment from 'moment';
import { useEffect, useState } from "react";
import { set, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import * as XLSX from 'xlsx';
import { KTCardBody } from '../../../../../../_metronic/helpers';
import { deleteItem, fetchDocument, postItem, updateItem } from '../../../urls';
import { ModalFooterButtons, PageActionButtons, calculateQuantityByField, calculateVolumesByField, convertExcelDateToJSDate, excelDateToJSDate, extractDateFromTimestamp, fuelIntakeData, getDateFromDateString, groupByBatchNumber, roundOff, timeStamp } from '../../CommonComponents';
import { Tabs } from 'antd';
import { TableProps } from 'react-bootstrap';
import { UploadChangeParam } from 'antd/es/upload';
import { time } from 'console';
import { MinusCircleOutlined, PlusCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { NumberSchema } from 'yup';



const FuelComponent = ({ dataToUpload, url, title, readFromFile }: any) => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadedFile, setUploadedFile] = useState<any>(null)
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false) // to show the update modal
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false) // to show the upload modal
    const [isFileUploaded, setIsFileUploaded] = useState(false) // to check if the file is uploaded
    const tenantId = localStorage.getItem('tenant')
    const [loading, setLoading] = useState(false)
    const { register, reset, handleSubmit } = useForm()
    const [tempData, setTempData] = useState<any>()
    const queryClient = useQueryClient()
    const [fileList, setFileList] = useState([]);
    const { data: pumps } = useQuery('pump', () => fetchDocument(`ProPump/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: equipments } = useQuery('equipmments', () => fetchDocument(`equipments/tenant/${tenantId}`), { cacheTime: 5000 })
    const [fileName, setFileName] = useState('') // to hold the name of the uploaded file
    const [isConfirmSaveModalOpen, setIsConfirmSaveModalOpen] = useState(false) // to show the modal to confirm the save
    const [isCheckDataModalOpen, setIsCheckDataModalOpen] = useState(false)  // to show the modal to check the data summaries from the uploaded file

    const [batchDataToSave, setBatchDataToSave]: any = useState<any[]>([]);

    const [rowCount, setRowCount] = useState(0) // to hold the number of rows read from the uploaded file
    const handleChange = (event: any) => {
        event.preventDefault()
        setTempData({ ...tempData, [event.target.name]: event.target.value });
    }
    const [dataFromAddB, setDataFromAddB] = useState([])

    // state to hold added items that will be batched and saved 
    let [batchData, setBatchData] = useState<any>([])

    const handleCancel = () => {
        reset()
        if (isUpdateModalOpen && isFileUploaded) {
            setIsModalOpen(false)
            setIsUpdateModalOpen(false)
            setTempData(null)
        } else {
            setIsModalOpen(false)
            setTempData(null)
            setIsUpdateModalOpen(false)
        }
    }

    const clearBatchData = () => {
        setBatchDataToSave([])
        setDataFromAddB([])
        setLoading(false)
        setRowCount(0)
    }

    const showModal = () => {
        setIsModalOpen(true)
    }

    const showUploadModal = () => {
        setIsUploadModalOpen(true)
    }

    const handleConfirmSaveCancel = () => {
        setIsConfirmSaveModalOpen(false)
    }

    const handleSaveClicked = () => {
        setIsConfirmSaveModalOpen(true)
        console.log('batchDataToSave: ', batchDataToSave)
    }
    const showCheckDataModal = (values: any) => {
        setIsCheckDataModalOpen(true)
    }
    const handleCheckDataCancel = () => {
        setIsCheckDataModalOpen(false)
    }


    const handleIsUploadModalCancel = () => {
        setIsUploadModalOpen(false)
        handleRemove()
        setUploading(false)
    }

    //hide Update table 
    const clearUpdateTable = () => {
        setIsFileUploaded(false)
        // setUploadedFile(null)
        setLoading(false)
        loadData()
    }

    const onOkay = () => {
        setUploading(true)
        // check if no file is uploaded
        if (!uploadedFile) {
            setUploading(false)
            message.error('No file uploaded!');
            return
        } else {
            handleUpload()
        }
    }

    const handleRemove = () => {
        setUploadedFile(null);
        setFileList([]);
    };

    const showUpdateModal = (values: any) => {
        showModal()
        setIsUpdateModalOpen(true)
        setTempData(values);
        console.log(values)
    }


    const uploadProps: UploadProps = {
        name: 'file',
        accept: '.xlsx, .xls, .csv',
        action: '',
        maxCount: 1,
        fileList: fileList,
        beforeUpload: (file: any) => {
            return new Promise((resolve, reject) => {
                // check if file is not uploaded
                if (!file) {
                    message.error('No file uploaded!');
                    reject(false)
                }
                else {
                    const updatedFileList: any = [file]; // Add the uploaded file to the fileList
                    setFileList(updatedFileList);
                    setFileName(file.name)
                    resolve(true)
                    setUploadedFile(file)
                }
            })
        },
        onRemove: () => { handleRemove() }
    }


    const loadData = async () => {
        // setLoading(true)
        // try {
        //     // const response = await fetchDocument(`${url}/tenant/${tenantId}`)
        //     // const data: any = fuelIntakeData(response.data)
        //     // setGridData(response.data)
        //     setLoading(false)
        // } catch (error) {
        //     setLoading(false)
        //     console.log(error)
        //     message.error(`${error}`)
        // }
    }

    useEffect(() => {
        console.log('batch', batchDataToSave);
        if (batchDataToSave.length > 0) {
            setDataFromAddB(batchDataToSave)
        }
        setRowCount(batchDataToSave.length)
    }, [batchDataToSave]);

    // group by pump
    const groupbyPump: any = {}
    dataFromAddB.forEach((item: any) => {
        if (!groupbyPump[item.pumpId]) {
            groupbyPump[item.pumpId] = []
        }
        groupbyPump[item.pumpId].push(item)
    })
    const quantityByPump = calculateQuantityByField(groupbyPump, pumps?.data, 'name')

    // group by equipment
    const groupbyEquipment: any = {}
    dataFromAddB.forEach((item: any) => {
        if (!groupbyEquipment[item.equipmentId]) {
            groupbyEquipment[item.equipmentId] = []
        }
        groupbyEquipment[item.equipmentId].push(item)
    })
    const quantityByEquipment = calculateQuantityByField(groupbyEquipment, equipments?.data, 'objId')

    const dynamicColumns = (title: any, data: any) => {
        const columns = [
            {
                title: title, dataIndex: 'field',
                render: (record: any) => <span style={{ color: '#3699FF' }}>
                    {record}
                </span>,
            },

            { title: 'Total Quantity', dataIndex: 'sum', render: (value: any) => <span>{roundOff(value).toLocaleString()}</span> },

        ];
        return columns;
    }
    const summaryFooter = (data: any) => <Tag color="error">{data === 1 ? `${data} row` : `${data} rows`}</Tag>

    // tab view for data summaries
    const tabItems: TabsProps['items'] = [
        {
            key: '1', label: `Pumps`,
            children: (
                <><Table dataSource={quantityByPump} columns={dynamicColumns('Pump', pumps)}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(quantityByPump.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
        {
            key: '2', label: `Equipments`,
            children: (
                <><Table dataSource={quantityByEquipment} columns={dynamicColumns('Equipment', equipments)}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(quantityByEquipment.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
    ];

    const onTabsChange = (key: string) => {
        //console.log(key);
    };

    const updateItemInBatchData = () => {
        setBatchDataToSave((prevBatchData: any[]) => {
            const updatedBatchData: any = prevBatchData.map((item) =>
                item === tempData ? tempData : item
            );
            console.log('manualUpdate: ', updatedBatchData)
            setDataFromAddB(updatedBatchData)
            setRowCount(updatedBatchData.length)
            handleCancel()
            return updatedBatchData;
        })
    };

    const removeItemFromBatchData = (itemToRemove: any) => {
        setBatchDataToSave((prevBatchData: any[]) => {
            const updatedBatchData: any = prevBatchData.filter((item) => item !== itemToRemove);
            setDataFromAddB(updatedBatchData)
            setRowCount(dataFromAddB.length)
            return updatedBatchData;
        });
    };

    const handleAddItem = handleSubmit(async (values: any) => {
        if (!values.intakeDate) {
            message.error('Please pick a date')
            return
        }
        const selectedDate = new Date(values.intakeDate);
        const data = {
            intakeDate: selectedDate.toISOString(),
            quantity: parseInt(values.quantity),
            pumpId: parseInt(values.pumpId),
            equipmentId: values.equipmentId,
            transactionType: title,
            tenantId: tenantId,
        }

        //validation check
        for (const [key, value] of Object.entries(data)) {
            if (title === 'Fuel Issue') {
                if (value === 'Select' || value === null || value === '') {
                    message.error(`Please fill in all fields`)
                    return
                }
                // make sure quantity is not negative
                if (key === 'quantity' && value < 0) {
                    message.error(`Quantity cannot be negative`)
                    return
                }
            } else {
                if (value === 'Select') {
                    message.error(`Please select pump`)
                    return
                }
                // make sure quantity is not negative
                if (key === 'quantity' && value < 0) {
                    message.error(`Quantity cannot be negative`)
                    return
                }
            }
        }

        const itemExists = (batchData: any) => batchData.some((item: any) => {
            return (
                item.pumpId === data.pumpId &&
                item.intakeDate === data.intakeDate &&
                item.equipmentId === data.equipmentId
            )
        })

        if (itemExists(batchDataToSave)) {
            message.error('Item already exists');
            return;
        }

        setBatchDataToSave((prevBatchData: any) => [...prevBatchData, data])
        setIsModalOpen(false)
        message.success('Item added to batch.')
        reset()
        console.log('batchDataToSave', batchDataToSave)
    })

    const handleBatchSave = () => {
        setLoading(true)
        try {
            const dateStamp = new Date().getTime()
            const dataToSaveWithDateStamp = batchDataToSave
                .filter((data: any) => data !== null && data !== undefined)
                .map((obj: any) => {
                    setLoading(true)
                    return {
                        ...obj,
                        batchNumber: `${dateStamp}`
                    };
                });

            console.log('batchData', batchDataToSave.slice(0, 10))
            // const filteredSavedData = dataToSave.filter((data: any) => data !== null && data !== undefined)
            const item = {
                data: dataToSaveWithDateStamp,
                url: url,
            }
            postData(item)
            message.success(
                `Saving ${dataToSaveWithDateStamp.length} ${dataToSaveWithDateStamp.length > 1 ? 'records' : 'record'} of batch data`, 6
            )
            console.log('batchDataWithDateStamp', dataToSaveWithDateStamp.slice(0, 10))
            handleConfirmSaveCancel()
            setIsConfirmSaveModalOpen(false)
            setLoading(false)
            clearBatchData()
        } catch (err) {
            console.log('fileSaveError: ', err)
            setLoading(false)
        }
    }

    const { mutate: postData, isLoading: postLoading } = useMutation(postItem, {
        onSuccess: (data) => {
            queryClient.setQueryData([url, tempData], data);
            message.success(`Batch saved successfully`);
            reset()
            setTempData({})
            loadData()
            setIsModalOpen(false)
        },
        onError: (error: any) => {
            console.log('batch post error: ', error)
            message.error(`${error}`)
        }
    })

    useEffect(() => {
        loadData()
    }, [])


    const mainColumns: any = title == 'Fuel Issue' ? [
        {
            title: 'Date', dataIndex: 'intakeDate',
            render: (text: any) => <span>{moment(text).format('YYYY-MM-DD')}</span>
        },
        { title: 'Equipment', dataIndex: 'equipmentId', },
        {
            title: 'Pump', dataIndex: 'pumpId',
            render: (text: any) => <span>{getRecordName(text, pumps?.data)}</span>

        },
        { title: 'Quantity', dataIndex: 'quantity', },
        {
            title: 'Action',
            fixed: 'right',
            width: 150,
            render: (_: any, record: any) => (

                <Space size='small'>
                    <a onClick={() => showUpdateModal(record)} className='btn btn-light-warning btn-sm'>
                        Update
                    </a>
                    <a onClick={() => removeItemFromBatchData(record)} className='btn btn-light-danger btn-sm'>
                        Delete
                    </a>
                </Space>

            ),
        }
    ] : [
        {
            title: 'Date', dataIndex: 'intakeDate',
            render: (text: any) => <span>{moment(text).format('YYYY-MM-DD')}</span>
        },
        {
            title: 'Pump', dataIndex: 'pumpId',
            render: (text: any) => <span>{getRecordName(text, pumps?.data)}</span>

        },
        { title: 'Quantity', dataIndex: 'quantity', },
        {
            title: 'Action',
            fixed: 'right',
            width: 150,
            render: (_: any, record: any) => (
                <Space size='small'>
                    <a onClick={() => showUpdateModal(record)} className='btn btn-light-warning btn-sm'>
                        Update
                    </a>
                    <a onClick={() => removeItemFromBatchData(record)} className='btn btn-light-danger btn-sm'>
                        Delete
                    </a>
                </Space>
            ),
        }
    ]


    const uploadFileColumns = title == 'Fuel Issue' ? [
        { title: 'Date', dataIndex: 'intakeDate', render: (text: any) => moment(excelDateToJSDate(text), 'YYYY-MM-DD').format('YYYY-MM-DD') },
        { title: 'Pump', dataIndex: 'pump' },
        { title: 'Equipment', dataIndex: 'equipment' },
        { title: 'Quantity', dataIndex: 'quantity', render: (text: any) => <span>{text.toLocaleString()}</span> },
    ] : [
        { title: 'Date', dataIndex: 'intakeDate', render: (text: any) => moment(excelDateToJSDate(text), 'YYYY-MM-DD').format('YYYY-MM-DD') },
        { title: 'Pump', dataIndex: 'pump' },
        { title: 'Quantity', dataIndex: 'quantity', render: (text: any) => <span>{text.toLocaleString()}</span> },
    ]

    const getRecordName = (id: any, data: any) => {
        let name = ''
        data.map((item: any) => {
            if (item.id === id) {
                name = item.name
            }
        })
        return name
    }


    const handleUpload = () => {

        const reader = new FileReader()
        const dateStamp = new Date().getTime()
        try {
            setUploading(true)
            reader.onload = (e: any) => {

                const file = new Uint8Array(e.target.result)

                const dataRead = readFromFile(file)
                console.log('readRows: ', dataRead.slice(0, 10))
                console.log('saveData: ', dataToUpload.slice(0, 10))
                handleRemove()

                const ignoredRows: any[] = [];
                dataToUpload.map((item: any) => {
                    // Check if the item already exists in batchDataToSave
                    const found = batchDataToSave.find((data: any) => data.intakeDate === item.intakeDate && data.pumpId === item.pumpId);

                    // Add the item to batchDataToSave only if it doesn't already exist
                    if (!found) {
                        setBatchDataToSave((prevBatchData: any) => [...prevBatchData, item]);
                    } else {
                        ignoredRows.push(item);
                    }
                });
                const ignoredRowCount = ignoredRows.length;
                if (ignoredRowCount > 0) {
                    message.info(`${ignoredRowCount} row(s) were ignored because they already exist.`);
                    setUploading(false)
                    setIsUploadModalOpen(false)
                    return
                }
                setUploading(false)
                setIsUploadModalOpen(false)
                message.success(`${dataToUpload.length} rows uploaded from ${fileName}`)

            }
        } catch (error) {
            setIsUploadModalOpen(false)
        }
        reader.readAsArrayBuffer(uploadedFile)
    }

    // const handleBatchSave1 = () => {
    //     try {
    //         setLoading(true)
    //         const filteredSavedData = dataToSave.filter((data: any) => data !== null && data !== undefined)
    //         const item = {
    //             data: filteredSavedData,
    //             url: url,
    //         }
    //         postData(item)
    //         setLoading(true)
    //         message.success(`Saving ${filteredSavedData.length}  of ${dataToSave.length} ${filteredSavedData.length > 1 ? 'records' : 'record'} of uploaded data`, 6)
    //         loadData()
    //         setIsFileUploaded(false)
    //         setIsConfirmSaveModalOpen(false)
    //         setUploadedFile(null)
    //         setUploadData([])
    //         setDataToSave([])
    //     } catch (err) {
    //         console.log('fileSaveError: ', err)
    //         setLoading(false)
    //     }
    // }

    return (
        <div className="card-custom card-flush">
            <div className="card-header" style={{ borderBottom: 'none' }}>
                <Space style={{ marginBottom: 16 }}>
                    <Button onClick={showCheckDataModal}
                        type='primary' size='large'
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        className={dataFromAddB.length <= 0 ? 'btn btn-secondary btn-sm' : 'btn btn-light-success btn-sm'}
                        disabled={dataFromAddB.length <= 0}
                    >
                        Check data
                    </Button>
                </Space>
                <div className="card-toolbar ">
                    <Space style={{ marginBottom: 16 }}>
                        <PageActionButtons
                            onAddClick={showModal}
                            onExportClicked={() => { console.log('export clicked') }}
                            onUploadClicked={showUploadModal}
                            hasAddButton={true}
                            hasExportButton={batchDataToSave.length < 1}
                            hasUploadButton={true}
                        />
                        {
                            batchDataToSave.length > 0 &&
                            <Space>
                                <Button onClick={handleSaveClicked}
                                    type='primary' size='large'
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }} className='btn btn-light-success btn-sm'>
                                    Save
                                </Button>

                                <Button onClick={clearBatchData}
                                    type='primary' size='large'
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }} className='btn btn-light-info btn-sm'>
                                    Clear
                                </Button>
                            </Space>
                        }
                    </Space>
                </div>
            </div>
            <KTCardBody className='py-4 '>
                <div className='table-responsive'>
                    <Table
                        columns={mainColumns}
                        dataSource={dataFromAddB}
                        loading={loading}
                    />

                    <Modal
                        title={isUpdateModalOpen ? `Update ${title}` : `Add ${title}`}
                        open={isModalOpen}
                        onCancel={handleCancel}
                        closable={true}
                        footer={
                            <ModalFooterButtons
                                onCancel={handleCancel}
                                onSubmit={isUpdateModalOpen ? updateItemInBatchData : handleAddItem} />
                        }
                    >
                        <form onSubmit={isUpdateModalOpen ? updateItemInBatchData : handleAddItem}>
                            <hr></hr>
                            {
                                title == 'Fuel Issue' ?
                                    <>
                                        <div style={{ padding: "20px 20px 0 20px" }} className='row mb-0 '>
                                            <div className='col-6'>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Date</label>
                                                <input type="date" {...register("intakeDate")} name="intakeDate" defaultValue={!isUpdateModalOpen ? '' : getDateFromDateString(tempData?.intakeDate)} onChange={handleChange} className="form-control form-control-white form-control-solid border border-gray-300" />
                                            </div>

                                            <div className='col-6'>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Quantity</label>
                                                <input type="number" {...register("quantity")} min={0} name='quantity' defaultValue={!isUpdateModalOpen ? 0 : tempData?.quantity} onChange={handleChange} className="form-control form-control-white form-control-solid border border-gray-300" />
                                            </div>
                                        </div>
                                        <div style={{ padding: "20px 20px 0 20px" }} className='row mb-9 '>
                                            <div className='col-6'>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Equipment</label>
                                                <select
                                                    {...register("equipmentId")}
                                                    onChange={handleChange}
                                                    className="form-select form-select-white form-control-solid border border-gray-300" aria-label="Select example">
                                                    {!isUpdateModalOpen && <option>Select</option>}
                                                    {
                                                        equipments?.data.map((item: any) => (
                                                            <option
                                                                selected={isUpdateModalOpen && tempData.equipmentId === item.equipmentId}
                                                                value={item.equipmentId}>{item.equipmentId}</option>
                                                        ))
                                                    }
                                                </select>

                                            </div>
                                            <div className='col-6'>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Pump</label>
                                                <select
                                                    {...register("pumpId")}
                                                    onChange={handleChange}
                                                    className="form-select form-select-white form-control-solid border border-gray-300" aria-label="Select example">
                                                    {!isUpdateModalOpen && <option>Select</option>}
                                                    {
                                                        pumps?.data.map((item: any) => (
                                                            <option
                                                                selected={isUpdateModalOpen && tempData.pumpId === item.id}
                                                                value={item.id}>{item.name}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                    :
                                    <>
                                        <div style={{ padding: "20px 20px 0 20px" }} className='row mb-0 '>
                                            <div className=' mb-7 '>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Date</label>
                                                <input type="date" {...register("intakeDate")} name="intakeDate" defaultValue={!isUpdateModalOpen ? '' : getDateFromDateString(tempData?.intakeDate)} onChange={handleChange}
                                                    className="form-control form-control-white form-control-solid border border-gray-300" />
                                            </div>

                                            <div className=' mb-7 '>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Pump</label>
                                                <select
                                                    {...register("pumpId")}
                                                    onChange={handleChange}
                                                    className="form-select form-control-solid border border-gray-300" aria-label="Select example">
                                                    {!isUpdateModalOpen && <option>Select</option>}
                                                    {
                                                        pumps?.data.map((item: any) => (
                                                            <option
                                                                selected={isUpdateModalOpen && tempData.pumpId === item.id}
                                                                value={item.id}>{item.name}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>

                                            <div className=' mb-7 '>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Quantity</label>
                                                <input type="number" {...register("quantity")} min={0} name='quantity' defaultValue={!isUpdateModalOpen ? 0 : tempData?.quantity} onChange={handleChange}
                                                    className="form-control form-control-white form-control-solid border border-gray-300" />
                                            </div>
                                        </div>
                                    </>
                            }
                        </form>
                    </Modal>

                    {/* Modal to upload file */}

                    <Modal
                        title='Upload File'
                        open={isUploadModalOpen}
                        onOk={onOkay}
                        onCancel={handleIsUploadModalCancel}
                        closable={true}
                    >
                        <Divider />
                        <Space size='large'>
                            <Upload
                                {...uploadProps}
                            >
                                <Button
                                    loading={uploading}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                    icon={<UploadOutlined rev={''} />}>Click to Upload</Button>
                            </Upload>
                        </Space>
                    </Modal>

                    {/* check data modal */}
                    <Modal
                        title={'Batch Summaries'}
                        open={isCheckDataModalOpen}
                        onCancel={handleCheckDataCancel}
                        width={800}
                        closable={true}
                        footer={
                            <>
                                <Button onClick={handleCheckDataCancel}
                                    type='primary' size='large'
                                    className='btn btn-light btn-sm w'>
                                    Ok
                                </Button>
                            </>}
                    >

                        <Tabs defaultActiveKey="1"
                            items={tabItems}
                            onChange={onTabsChange}
                            tabBarExtraContent={
                                <>
                                    <Tag color="geekblue">{rowCount === 1 ? `${rowCount} record` : `${rowCount} records`}</Tag>
                                </>
                            } />
                    </Modal>

                    {/* confirm save modal */}
                    <Modal
                        title='Confirm Save'
                        open={isConfirmSaveModalOpen}
                        onCancel={handleConfirmSaveCancel}
                        closable={true}
                        footer={
                            <Space>
                                <Button onClick={handleConfirmSaveCancel}
                                    type='primary'
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                    className='btn btn-danger btn-sm w'>
                                    Cancel
                                </Button>
                                <Button onClick={handleBatchSave}
                                    type='primary'
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                    className='btn btn-success btn-sm w'>
                                    Proceed
                                </Button>
                            </Space>}
                    >
                        <Divider />
                        <div className='row'>
                            <div className='col-12'>
                                <p className='fw-bold text-gray-800 d-block fs-3'>Are you sure you want to save?</p>
                                <p className='fw-bold text-gray-800 d-block fs-3'>
                                    {rowCount === 1 ? `About to save ${rowCount} record.` : ` There are ${rowCount} records to be saved.`}
                                </p>
                            </div>
                        </div>
                    </Modal>

                </div>
            </KTCardBody>
        </div>
    )
};

export { FuelComponent }