import { Button, Divider, Input, Modal, Space, Table, TableColumnsType, TabsProps, Tag, Upload, UploadFile, UploadProps, message } from 'antd';
import moment from 'moment';
import { useEffect, useState } from "react";
import { set, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import * as XLSX from 'xlsx';
import { KTCardBody } from '../../../../../../_metronic/helpers';
import { deleteItem, fetchDocument, postItem, updateItem } from '../../../urls';
import { ModalFooterButtons, PageActionButtons, calculateVolumesByField, convertExcelDateToJSDate, excelDateToJSDate, extractDateFromTimestamp, fuelIntakeData, getDateFromDateString, groupByBatchNumber, roundOff, timeStamp } from '../../CommonComponents';
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
    const [isCheckDataModalOpen, setIsCheckDataModalOpen] = useState(false)  // to show the modal to check the data summaries from the uploaded file
    const [isBatchDataCheckModalOpen, setIsBatchDataCheckModalOpen] = useState(false) // to show the modal to check the data summaries from batch data 
    const [submitLoading, setSubmitLoading] = useState(false)
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


    const [uploadColumns, setUploadColumns] = useState<any>([]) //to hold the table columns of the uploaded file
    const [uploadData, setUploadData] = useState<any>([]) // to hold the data read from the uploaded file
    const [rowCount, setRowCount] = useState(0) // to hold the number of rows read from the uploaded file
    const [dataToSave, setDataToSave] = useState<any>([]) // to hold the data to be saved from the uploaded file
    const [gridData, setGridData] = useState([])
    const handleChange = (event: any) => {
        event.preventDefault()
        setTempData({ ...tempData, [event.target.name]: event.target.value });
    }

    // state to hold added items that will be batched and saved 
    let [batchData, setBatchData] = useState<any>([])

    const handleCancel = () => {
        reset()
        setIsModalOpen(false)
        setIsUpdateModalOpen(false)
        setTempData(null)
        setIsUploadModalOpen(false)
        setIsFileUploaded(false)
        handleRemove()
        setUploadedFile(null)
        setUploading(false)
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
    }

    //hide Update table 
    const clearUpdateTable = () => {
        setIsFileUploaded(false)
        // setUploadedFile(null)
        setLoading(false)
        loadData()
    }

    const onOkay = () => {
        // check if no file is uploaded
        if (!uploadedFile) {
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

    const { mutate: deleteData, isLoading: deleteLoading } = useMutation(deleteItem, {
        onSuccess: (data) => {
            queryClient.setQueryData([url, tempData], data);
            loadData()
        },
        onError: (error) => {
            console.log('delete error: ', error)
        }
    })

    function handleDelete(element: any) {
        const item = {
            url: url,
            data: element
        }
        deleteData(item)
    }

    const uploadProps: UploadProps = {
        name: 'file',
        accept: '.xlsx, .xls',
        action: '',
        maxCount: 1,
        fileList: fileList,
        beforeUpload: (file: any) => {
            return new Promise((resolve, reject) => {
                // check if file is not uploaded
                if (!file || fileList.length === 1) {
                    message.error('No file uploaded!');
                    reject(false)
                }
                else {
                    const updatedFileList: any = [...fileList, file]; // Add the uploaded file to the fileList
                    setFileList(updatedFileList);
                    setFileName(file.name)
                    resolve(true)
                    setUploadedFile(file)
                }
            })
        },
        onRemove: () => { handleRemove() }
    }

    const showBatchDataCheckModal = (values: any) => {
        setIsBatchDataCheckModalOpen(true)
        setIsCheckDataModalOpen(true)
        console.log('batchValues: ', values)
        //  populateBatchData(values)
    }


    const loadData = async () => {
        setLoading(true)
        try {
            const response = await fetchDocument(`${url}/tenant/${tenantId}`)
            const data: any = fuelIntakeData(response.data)
            setGridData(data)
            setLoading(false)
        } catch (error) {
            setLoading(false)
            console.log(error)
            message.error(`${error}`)
        }
    }

    const handleUpdate = (e: any) => {
        setSubmitLoading(true)
        e.preventDefault()
        const item = {
            url: url,
            data: { ...tempData, pumpId: parseInt(tempData.pumpId), quantity: parseInt(tempData.quantity) }
        }
        updateData(item)
        console.log('update: ', item.data)
    }

    const { isLoading: updateLoading, mutate: updateData } = useMutation(updateItem, {
        onSuccess: (data) => {
            queryClient.setQueryData([url, tempData], data);
            reset()
            setTempData({})
            loadData()
            setIsUpdateModalOpen(false)
            setIsModalOpen(false)
        },
        onError: (error) => {
            setSubmitLoading(false)
            console.log('error: ', error)
            message.error(`${error}`)
        }
    })

    const OnSubmit = handleSubmit(async (values: any) => {
        setSubmitLoading(true)
        const selectedDate = new Date(values.intakeDate);
        const item = {
            data: [
                {
                    intakeDate: selectedDate.toISOString(),
                    quantity: parseInt(values.quantity),
                    pumpId: parseInt(values.pumpId),
                    equipmentId: values.equipmentId,
                    batchNumber: `${Date.now()}`,
                    transactionType: title,
                    tenantId: tenantId,
                },
            ],
            url: url
        }
        for (const [key, value] of Object.entries(item.data[0])) {
            if (value === null || value === '') {
                message.error(`Please fill in all fields`)
                setSubmitLoading(false)
                return
            }
        }
        console.log(item.data)
        postData(item)
    })

    const { mutate: postData, isLoading: postLoading } = useMutation(postItem, {
        onSuccess: (data) => {
            queryClient.setQueryData([url, tempData], data);
            reset()
            setTempData({})
            loadData()
            setIsModalOpen(false)
            setSubmitLoading(false)
        },
        onError: (error: any) => {
            setSubmitLoading(false)
            console.log('post error: ', error)
            if (error?.response.status === 409) {
                message.error(`Data already exists for ${tenantId}`)
            } else {
                message.error(`${error}`)
            }
        }
    })

    useEffect(() => {
        loadData()
    }, [])


    const columns: ColumnsType = [
        { title: 'Date', dataIndex: 'date', },
        { title: 'Batch Number', dataIndex: 'batchNumber', },
        // { title: 'Pump', dataIndex: 'pumpId', },
        {
            title: 'Items',
            dataIndex: 'itemsCount',
            render: (text: any) => <Tag color="geekblue">{text} {text > 1 ? 'records' : 'record'} </Tag>
        },
        {
            title: title == 'Fuel Issue' ? 'Total Qty Issued' : 'Total Qty Received',
            dataIndex: 'totalQuantity', render: (text: any) => <span>{text.toLocaleString()}</span>
        },

        {
            title: 'Action',
            fixed: 'right',
            width: 150,
            render: (_: any, record: any) => (
                <Space size='middle'>
                    {
                        record.itemsCount == 1 &&
                        <Space size='small'>
                            <a onClick={() => showUpdateModal(record?.records[0])} className='btn btn-light-warning btn-sm'>
                                Update
                            </a>
                            <a onClick={() => handleDelete(record?.records[0])} className='btn btn-light-danger btn-sm'>
                                Delete
                            </a>
                        </Space>
                    }
                    {
                        record.itemsCount > 1 &&
                        <a className='btn btn-light-success btn-sm'>
                            Check Data
                        </a>
                    }
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

    interface ExpandedDataType {
        key: React.Key;
        pumpId: number;
        equipmentId: string;
    }

    const expandedRowRender = (record: any) => {
        const rowColumns: TableColumnsType<ExpandedDataType> = [
            { title: 'Pump', dataIndex: 'pumpId', key: 'pump', render: (record: any) => <span>{getRecordName(record?.id, pumps?.data)}</span> },
            { title: 'Equipment', dataIndex: 'equipmentId', key: 'equipment', },
        ]
        return <Table columns={rowColumns} dataSource={record.records[0]} pagination={false} />
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
                setDataToSave(dataToUpload)
                setUploading(false)
                setIsUploadModalOpen(false)
                setIsFileUploaded(true)
                setUploadData(dataRead)
                setRowCount(dataRead.length)
                setUploadColumns(uploadFileColumns)
            }
        } catch (error) {
            setIsUploadModalOpen(false)
        }
        reader.readAsArrayBuffer(uploadedFile)
    }

    const saveTableObjects = () => {
        try {
            setLoading(true)
            const filteredSavedData = dataToSave.filter((data: any) => data !== null && data !== undefined)
            const item = {
                data: filteredSavedData,
                url: url,
            }
            postData(item)
            setLoading(true)
            message.success(`Saving ${filteredSavedData.length}  of ${dataToSave.length} ${filteredSavedData.length > 1 ? 'records' : 'record'} of uploaded data`, 6)
            loadData()
            setIsFileUploaded(false)
            setIsConfirmSaveModalOpen(false)
            setUploadedFile(null)
            setUploadData([])
            setDataToSave([])
        } catch (err) {
            console.log('fileSaveError: ', err)
            setLoading(false)
        }
    }



    return (
        <div className="card-custom card-flush">
            <div className="card-header" style={{ borderBottom: 'none' }}>
                <Space style={{ marginBottom: 16 }}>
                    {
                        isFileUploaded ?
                            <span className="fw-bold text-gray-800 d-block fs-3">Showing data read from {fileName}</span>
                            :
                            <>
                                <Input
                                    placeholder='Enter Search Text'
                                    type='text'
                                    allowClear size='large'
                                />
                                <Button type='primary' size='large'>
                                    Search
                                </Button>
                            </>
                    }

                </Space>
                <div className="card-toolbar ">
                    <Space style={{ marginBottom: 16 }}>
                        {
                            isFileUploaded ?
                                <Space>
                                    {/* <Button
                                        type='primary' size='large'
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                        className='btn btn-light-success btn-sm'
                                    >
                                        Check data
                                    </Button> */}
                                    <Button
                                        onClick={handleSaveClicked}
                                        type='primary' size='large'
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }} className='btn btn-light-success btn-sm'>
                                        Save
                                    </Button>
                                    <Button onClick={clearUpdateTable}
                                        type='primary' size='large'
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }} className='btn btn-light-info btn-sm'>
                                        Clear
                                    </Button>
                                </Space>
                                :
                                <PageActionButtons
                                    onAddClick={showModal}
                                    onExportClicked={() => { console.log('export clicked') }}
                                    onUploadClicked={showUploadModal}
                                    hasAddButton={true}
                                    hasExportButton={true}
                                    hasUploadButton={true}
                                />
                        }
                    </Space>
                </div>
            </div>
            <KTCardBody className='py-4 '>
                <div className='table-responsive'>
                    <Table
                        loading={loading}
                        columns={isFileUploaded ? uploadColumns : columns}
                        expandable={{
                            // expandIcon: ({ expanded, onExpand, record }) => {
                            //     if (record.records.length > 1) {
                            //         return <></>
                            //     }
                            //     return expanded ? (
                            //         <MinusCircleOutlined onClick={e => onExpand(record, e)} rev={undefined} />
                            //     ) : (
                            //         <PlusCircleOutlined onClick={e => onExpand(record, e)} rev={undefined} />
                            //     )
                            // },
                            expandedRowRender: (record) => expandedRowRender(record),
                            rowExpandable: (records) => records.length === 1,
                        }}
                        dataSource={isFileUploaded ? uploadData : gridData}
                    />

                    <Modal
                        title={isUpdateModalOpen ? `Update ${title}` : `Add ${title}`}
                        open={isModalOpen}
                        onCancel={handleCancel}
                        closable={true}
                        footer={
                            <ModalFooterButtons
                                onCancel={handleCancel}
                                onSubmit={isUpdateModalOpen ? handleUpdate : OnSubmit} />
                        }
                    >
                        <form onSubmit={isUpdateModalOpen ? handleUpdate : OnSubmit}>
                            <hr></hr>
                            {
                                title == 'Fuel Issue' ?

                                    <>
                                        <div style={{ padding: "20px 20px 0 20px" }} className='row mb-0 '>
                                            <div className='col-6'>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Date</label>
                                                <input type="date" {...register("intakeDate")} name="intakeDate" defaultValue={!isUpdateModalOpen ? '' : getDateFromDateString(tempData?.intakeDate)} onChange={handleChange} className="form-control form-control-white" />
                                            </div>

                                            <div className='col-6'>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Quantity</label>
                                                <input type="number" {...register("quantity")} min={0} name='quantity' defaultValue={!isUpdateModalOpen ? '' : tempData?.quantity} onChange={handleChange} className="form-control form-control-white" />
                                            </div>
                                        </div>
                                        <div style={{ padding: "20px 20px 0 20px" }} className='row mb-9 '>
                                            <div className='col-6'>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Equipment</label>
                                                <select
                                                    {...register("equipmentId")}
                                                    onChange={handleChange}
                                                    className="form-select form-select-white" aria-label="Select example">
                                                    {!isUpdateModalOpen && <option>Select</option>}
                                                    {
                                                        equipments?.data.map((item: any) => (
                                                            <option
                                                                selected={isUpdateModalOpen && tempData.equipmentId}
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
                                                    className="form-select form-select-white" aria-label="Select example">
                                                    {!isUpdateModalOpen && <option>Select</option>}
                                                    {
                                                        pumps?.data.map((item: any) => (
                                                            <option
                                                                selected={isUpdateModalOpen && tempData.pump?.id}
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
                                                <input type="date" {...register("intakeDate")} name="intakeDate" defaultValue={!isUpdateModalOpen ? '' : getDateFromDateString(tempData?.intakeDate)} onChange={handleChange} className="form-control form-control-white" />
                                            </div>

                                            <div className=' mb-7 '>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Pump</label>
                                                <select
                                                    {...register("pumpId")}
                                                    onChange={handleChange}
                                                    className="form-select form-select-white" aria-label="Select example">
                                                    {!isUpdateModalOpen && <option>Select</option>}
                                                    {
                                                        pumps?.data.map((item: any) => (
                                                            <option
                                                                selected={isUpdateModalOpen && tempData.pump?.pumpId}
                                                                value={item.id}>{item.name}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>

                                            <div className=' mb-7 '>
                                                <label htmlFor="exampleFormControlInput1" className="form-label text-gray-500">Quantity</label>
                                                <input type="number" {...register("quantity")} min={0} name='quantity' defaultValue={!isUpdateModalOpen ? '' : tempData?.quantity} onChange={handleChange} className="form-control form-control-white" />
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
                        confirmLoading={uploading}
                        onCancel={handleCancel}
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
                                <Button onClick={saveTableObjects}
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
                                <p className='fw-bold text-gray-800 d-block fs-3'>There are {rowCount} records to be saved.</p>
                            </div>
                        </div>
                    </Modal>

                </div>
            </KTCardBody>
        </div>
    )
};

export { FuelComponent }