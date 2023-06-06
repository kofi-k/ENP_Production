import { Button, Input, Modal, Space, Table, UploadProps, message } from 'antd';
import { useEffect, useState } from "react";
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { KTCardBody } from '../../../../../_metronic/helpers';
import { deleteItem, fetchDocument, postItem, updateItem } from '../../urls';
import {
    ModalFooterButtons, PageActionButtons,
    getDateFromDateString
} from '../CommonComponents';



const DrillEntry = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false) // to show the upload modal
    const [uploadedFile, setUploadedFile] = useState<any>(null)
    const [gridData, setGridData] = useState([])
    let [filteredData] = useState([])
    const [submitLoading, setSubmitLoading] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [isFileUploaded, setIsFileUploaded] = useState(false) // to check if the file is uploaded
    const [isCheckDataModalOpen, setIsCheckDataModalOpen] = useState(false)  // to show the modal to check the data summaries from the uploaded file
    const [isBatchDataCheckModalOpen, setIsBatchDataCheckModalOpen] = useState(false) // to show the modal to check the data summaries from batch data 
    const tenantId = localStorage.getItem('tenant')
    const [rowCount, setRowCount] = useState(0) // to hold the number of rows read from the uploaded file
    const [batchRowsCount, setBatchRowsCount] = useState(0) // to hold the number of rows read from the batch data
    const [savedCount, setSavedCount] = useState(0) // to hold the number of rows saved from the uploaded file

    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false) //  to show the update modal
    const [tempData, setTempData] = useState<any>()
    const { register, reset, handleSubmit } = useForm()
    const queryClient = useQueryClient()
    const [uploadColumns, setUploadColumns] = useState<any>([]) //to hold the table columns of the uploaded file
    const [uploadData, setUploadData] = useState<any>([]) // to hold the data read from the uploaded file
    const [dataToSave, setDataToSave] = useState<any>([]) // to hold the data to be saved from the uploaded file

    const { data: allRigs } = useQuery('rigs', () => fetchDocument(`ProDrill/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allShifts } = useQuery('shifts', () => fetchDocument(`ProductionShift/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: productionActivities } = useQuery('activity', () => fetchDocument(`ProductionActivity/tenant/${tenantId}`), { cacheTime: 5000 })


    let [batchVolumesByHauler, setBatchVolumesByHauler] = useState<any>([]) // to hold the volumes by hauler
    let [batchVolumesByLoader, setBatchVolumesByLoader] = useState<any>([]) // to hold the volumes by loader
    let [batchVolumesByOrigin, setBatchVolumesByOrigin] = useState<any>([]) // to hold the volumes by origin
    let [batchVolumesByDestination, setBatchVolumesByDestination] = useState<any>([]) // to hold the volumes by destination
    const [fileList, setFileList] = useState([]);
    const [fileName, setFileName] = useState('') // to hold the name of the uploaded file
    const [isConfirmSaveModalOpen, setIsConfirmSaveModalOpen] = useState(false) // to show the modal to confirm the save

    const handleChange = (event: any) => {
        event.preventDefault()
        setTempData({ ...tempData, [event.target.name]: event.target.value });
    }

    const onTabsChange = (key: string) => {
        //console.log(key);
    };

    const showModal = () => {
        setIsModalOpen(true)
    }

    const showUploadModal = () => {
        setIsUploadModalOpen(true)
    }

    const showCheckDataModal = (values: any) => {
        setIsCheckDataModalOpen(true)
    }

    const handleRemove = () => {
        setUploadedFile(null);
        setFileList([]);
    };

    const showBatchDataCheckModal = (values: any) => {
        setIsBatchDataCheckModalOpen(true)
        setIsCheckDataModalOpen(true)
        console.log('batchValues: ', values)
    }

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

    const handleCheckDataCancel = () => {
        setIsCheckDataModalOpen(false)
        setIsBatchDataCheckModalOpen(false)
        setBatchVolumesByDestination([])
        setBatchVolumesByOrigin([])
        setBatchVolumesByLoader([])
        setBatchVolumesByHauler([])
    }

    const handleConfirmSaveCancel = () => {
        setIsConfirmSaveModalOpen(false)
    }

    const handleSaveClicked = () => {
        setIsConfirmSaveModalOpen(true)
    }

    const { mutate: deleteData, isLoading: deleteLoading } = useMutation(deleteItem, {
        onSuccess: (data) => {
            queryClient.setQueryData(['proDrillEntry', tempData], data);
            loadData()
        },
        onError: (error) => {
            console.log('delete error: ', error)
        }
    })

    function handleDelete(element: any) {
        const item = {
            url: 'proDrillEntry',
            data: element
        }
        deleteData(item)
    }

    const getRecordName = (id: any, data: any) => {
        let name = ''
        data?.map((item: any) => {
            if (item.id === id) {
                name = item.name
            }
        })
        return name
    }

    const getUnitRecordName = (id: any, data: any) => {
        let name = ''
        data?.map((item: any) => {
            if (item.id === id) {
                name = item.modelName
            }
        })
        return name
    }

    const getOperatorRecordName = (id: any, data: any) => {
        let name = ''
        data?.map((item: any) => {
            if (item.empCode === id) {
                name = item.empName
            }
        })
        return name
    }

    const columns: any = [
        {
            title: 'Date',
            dataIndex: 'drillDate',
        },
        {
            title: 'Rig',
            dataIndex: 'rigId',// from drill setup
        },
        {
            title: 'Shift',
            dataIndex: 'shiftId',
        },
        {
            title: 'Activity',
            dataIndex: 'activityId', // from activity setup
        },
        {
            title: 'Action',
            fixed: 'right',
            width: 160,
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
                        <a onClick={() => showBatchDataCheckModal(record?.records)} className='btn btn-light-success btn-sm'>
                            Check Data
                        </a>
                    }
                </Space>
            ),
        },
    ]

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
                // upload excel file only 
                if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && file.type !== 'application/vnd.ms-excel') {
                    message.error(`${file.name} is not a excel file`);
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

    const loadData = async () => {
        setLoading(true)
        try {
            const response = await fetchDocument(`proDrillEntry/tenant/${tenantId}`)
            setGridData(response?.data)
            setLoading(false)
        } catch (error) {
            setLoading(false)
            console.log(error)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const dataWithIndex = gridData.map((item: any, index) => ({
        ...item,
        key: index,
    }))

    const handleInputChange = (e: any) => {
        setSearchText(e.target.value)
        if (e.target.value === '') {
            loadData()
        }
    }

    const globalSearch = () => {
        // // @ts-ignore
        // filteredData = dataWithVehicleNum.filter((value) => {
        //     return (
        //         value.fleetID.toLowerCase().includes(searchText.toLowerCase()) ||
        //         value.modlName.toLowerCase().includes(searchText.toLowerCase())
        //     )
        // })
        // setGridData(filteredData)
    }
    const { isLoading: updateLoading, mutate: updateData } = useMutation(updateItem, {
        onSuccess: (data) => {
            setLoading(true)
            queryClient.setQueryData(['cycleDetails', tempData], data);
            reset()
            setTempData({})
            loadData()
            setIsUpdateModalOpen(false)
            setIsModalOpen(false)
            setLoading(false)
        },
        onError: (error) => {
            setLoading(false)
            console.log('error: ', error)
            message.error(`${error}`)
        }
    })

    const handleUpdate = (e: any) => {
        e.preventDefault()
        const item = {
            url: 'proDrillEntry',
            data: tempData
        }
        updateData(item)
        console.log('update: ', item.data)
    }

    const showUpdateModal = (values: any) => {
        showModal()
        setIsUpdateModalOpen(true)
        setTempData(values);
        console.log(values)
    }

    const OnSubmit = handleSubmit(async (values) => {
        if (!values.drillDate) {
            message.error('Please pick a date')
            return
        }
        setSubmitLoading(true)
        const selectedDate = new Date(values.drillDate);
        const item = {
            data: {
                drillDate: selectedDate.toISOString(),
                shiftId: parseInt(values.shiftId),
                activityId: parseInt(values.activityId),
                drillId: parseInt(values.drillId),
                tenantId: `${tenantId}`,
            },
            url: 'proDrillEntry'
        }
        // check each property of data object is not empty 
        for (const [key, value] of Object.entries(item.data)) {
            if (value === '' || value === null || value === undefined || value === 'Select') {
                message.error(`Please fill ${key} field`)
                setSubmitLoading(false)
                return
            }
        }
        console.log(item.data)
        postData(item)
    })

    const { mutate: postData, isLoading: postLoading } = useMutation(postItem, {
        onSuccess: (data) => {
            setLoading(true)
            queryClient.setQueryData(['cycleDetails'], data);
            setSavedCount(isFileUploaded ? savedCount + 1 : 0)
            reset()
            setTempData({})
            loadData()
            setIsModalOpen(false)
            setSubmitLoading(false)
            setLoading(false)
        },
        onError: (error) => {
            setLoading(false)
            setSubmitLoading(false)
            console.log('post error: ', error)
            message.error(`${error}`)
        }
    })


    return (
        <div className="card  border border-gray-400  card-custom card-flush" >
            <div className="card-header mt-7">
                <Space style={{ marginBottom: 16 }}>
                    <Input
                        placeholder='Enter Search Text'
                        type='text'
                        allowClear size='large'
                    />
                    <Button type='primary' size='large'>
                        Search
                    </Button>

                </Space>
                <div className="card-toolbar">
                    <Space style={{ marginBottom: 16 }}>
                        <PageActionButtons
                            onAddClick={showModal}
                            onExportClicked={() => { }}
                            onUploadClicked={() => { }}
                            hasAddButton={true}
                            hasExportButton={true}
                            hasUploadButton={false}
                        />
                    </Space>
                </div>
            </div>
            <KTCardBody className='py-4 '>
                <div className='table-responsive'>
                    <div className='d-flex  justify-content-between'>

                    </div>

                    <Table
                        columns={columns}
                        dataSource={[]}
                        scroll={isFileUploaded ? { x: 1300 } : {}}
                        loading={loading}
                    />

                    <Modal
                        title={isUpdateModalOpen ? 'Update Drill Entry' : 'Drill Entry'}
                        open={isModalOpen}
                        onCancel={handleCancel}
                        width={600}
                        closable={true}
                        footer={
                            <ModalFooterButtons
                                onCancel={handleCancel}
                                onSubmit={isUpdateModalOpen ? '' : OnSubmit} />
                        }
                    >
                        <form>
                            <div style={{ padding: "20px 20px 0 20px" }} className='row mb-0 '>
                                <div className='col-6'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Date</label>
                                    <input type="date" {...register("drillDate")} name="drillDate"
                                        defaultValue={!isUpdateModalOpen ? '' : getDateFromDateString(tempData?.drillDate)} onChange={handleChange}
                                        className="form-control form-control-solid border border-gray-300" />
                                </div>

                                <div className='col-6'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500 ">Rig</label>
                                    <select
                                        {...register("drillId")}
                                        onChange={handleChange}
                                        className="form-select form-select-solid form-control-solid border border-gray-300"
                                        aria-label="Select example">
                                        {!isUpdateModalOpen && <option>Select</option>}
                                        {
                                            allRigs?.data.map((item: any) => (
                                                <option
                                                    selected={isUpdateModalOpen && item.id === tempData.drillId}
                                                    value={item.equipmentId}>{item.equipmentId}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>
                            <div style={{ padding: "20px 20px 0 20px" }} className='row mb-7'>
                                <div className='col-6'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500 ">Activity</label>
                                    <select
                                        {...register("activityId")}
                                        onChange={handleChange}
                                        className="form-select form-select-solid form-control-solid border border-gray-300" aria-label="Select example">
                                        {!isUpdateModalOpen && <option>Select</option>}
                                        {
                                            productionActivities?.data.map((item: any) => (
                                                <option
                                                    selected={isUpdateModalOpen && item.id === tempData.activityId}
                                                    value={item.id}>{item.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className='col-6'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500 ">Shift</label>
                                    <select
                                        {...register("shiftId")}
                                        onChange={handleChange}
                                        className="form-select form-select-solid form-control-solid border border-gray-300" aria-label="Select example">
                                        {!isUpdateModalOpen && <option>Select</option>}
                                        {
                                            allShifts?.data.map((item: any) => (
                                                <option
                                                    selected={isUpdateModalOpen && item.id === tempData.shiftId}
                                                    value={item.id}>{item.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>
                        </form>
                    </Modal>
                </div>
            </KTCardBody >
        </div >
    )
}

export { DrillEntry };

