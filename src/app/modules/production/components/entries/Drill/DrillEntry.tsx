import { Button, Input, Modal, Space, Table, message } from 'antd';
import moment from 'moment';
import { useEffect, useState } from "react";
import { set, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { KTCardBody } from '../../../../../../_metronic/helpers';
import { deleteItem, fetchDocument, postItem, updateItem } from '../../../urls';
import {
    ModalFooterButtons, PageActionButtons,
    getDateFromDateString
} from '../../CommonComponents';
import { text } from '@devexpress/analytics-core/analytics-diagram';



const DrillEntry = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false) // to show the upload modal
    const [gridData, setGridData] = useState([])
    let [filteredData] = useState([])
    const [submitLoading, setSubmitLoading] = useState(false)
    const [searchText, setSearchText] = useState('')
    const tenantId = localStorage.getItem('tenant')
    const [activityDetailValue, setActivityDetailValue] = useState<any>()

    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false) //  to show the update modal
    const [tempData, setTempData] = useState<any>()
    const { register, reset, handleSubmit } = useForm()
    const queryClient = useQueryClient()

    const { data: allRigs } = useQuery('rigs', () => fetchDocument(`ProDrill/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allShifts } = useQuery('shifts', () => fetchDocument(`ProductionShift/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: productionActivities } = useQuery('activity', () => fetchDocument(`ProductionActivity/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: proActivityDetails } = useQuery('activityDetails', () => fetchDocument(`ProActivityDetails/tenant/${tenantId}`), { cacheTime: 5000 })


    const handleChange = (event: any) => {
        event.preventDefault()
        setTempData({ ...tempData, [event.target.name]: event.target.value });
        //check if selected value is activityMappingId
        if (event.target.name === 'activityMappingId') {
            const [activityId, activityDetailId] = event.target.value.split('-');
            // console.log('activityId: ', activityId, 'activityDetailId: ', activityDetailId  )
            setTempData({ ...tempData, activityId: parseInt(activityId), activityDetailId: parseInt(activityDetailId) });
        }
        if (event.target.name === 'drillDate') {
            const selectedDate = new Date(event.target.value);
            setTempData({ ...tempData, [event.target.name]: selectedDate.toISOString() });
        }
    }

    const onTabsChange = (key: string) => {
        //console.log(key);
    };

    const activityMapping = productionActivities?.data.flatMap((activity: any) => {
        const subActivities = proActivityDetails?.data.filter((detail: any) => detail.activityId === activity.id);
        const subActivityMappings = subActivities?.map((subActivity: any) => ({
            activity: { id: activity?.id, name: activity?.name },
            subActivity: { id: subActivity?.id, name: subActivity?.name },
        }));
        return subActivityMappings;
    });


    const showModal = () => {
        setIsModalOpen(true)
    }


    const handleCancel = () => {
        reset()
        setIsModalOpen(false)
        setIsUpdateModalOpen(false)
        setTempData(null)
        setIsUploadModalOpen(false)
        setUploading(false)
    }


    const { mutate: deleteData, isLoading: deleteLoading } = useMutation(deleteItem, {
        onSuccess: (data) => {
            queryClient.setQueryData(['proDrillEntry', tempData], data);
            loadData()
        },
        onError: (error) => {
            // console.log('delete error: ', error)
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

    const columns: any = [
        {
            title: 'Date',
            dataIndex: 'drillDate',
            fixed: 'left',
            render: (text: any) => moment(text).format('DD/MM/YYYY')
        },
        {
            title: 'Rig',
            dataIndex: 'rigId',
        },
        {
            title: 'Shift',
            dataIndex: 'shiftId',
            render: (text: any) => getRecordName(text, allShifts?.data)
        },
        {
            title: 'Activity',
            dataIndex: 'activityId',
            render: (text: any) => getRecordName(text, productionActivities?.data)
        },
        {
            title: 'Activity Detail',
            dataIndex: 'activityDetailId',
            render: (text: any) => getRecordName(text, proActivityDetails?.data)
        },
        {
            title: 'Meter Value',
            dataIndex: 'meterValue',
        },
        {
            title: 'Action',
            fixed: 'right',
            width: 180,
            render: (_: any, record: any) => (
                <Space size='middle'>
                    {
                        <Space size='small'>
                            <a onClick={() => showUpdateModal(record)} className='btn btn-light-warning btn-sm'>
                                Update
                            </a>
                            <a onClick={() => handleDelete(record)} className='btn btn-light-danger btn-sm'>
                                Delete
                            </a>
                        </Space>
                    }
                </Space>
            ),
        },
    ]

    const loadData = async () => {
        setLoading(true)
        try {
            const response = await fetchDocument(`ProDrillEntry/tenant/${tenantId}`)
            setGridData(response?.data)
            setLoading(false)
        } catch (error) {
            setLoading(false)
            // console.log(error)
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
            // console.log('error: ', error)
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
        // console.log('update: ', item.data)
    }

    const showUpdateModal = (values: any) => {
        showModal()
        setIsUpdateModalOpen(true)
        setTempData(values);
        // console.log(values)
    }

    const OnSubmit = handleSubmit(async (values) => {
        if (!values.drillDate) {
            message.error('Please pick a date')
            return
        }
        setSubmitLoading(true)
        const selectedDate = new Date(values.drillDate);
        const [activityId, activityDetailId] = values.activityMappingId.split('-');
        const item = {
            data: {
                drillDate: selectedDate.toISOString(),
                shiftId: parseInt(values.shiftId),
                activityId: parseInt(activityId),
                activityDetailId: parseInt(activityDetailId),
                rigId: values.rigId,
                meterValue: parseInt(values.meterValue),
                tenantId: `${tenantId}`,
            },
            url: 'proDrillEntry'
        }
        // check each property of data object is not empty
        for (const [key, value] of Object.entries(item.data)) {
            if (value === 'Select') {
                message.error(`Please select ${key} field`)
                setSubmitLoading(false)
                return
            }
        }
        // check if meter value is less than zero
        if (item.data.meterValue < 0) {
            message.error(`Meter value can't be negative`)
            setSubmitLoading(false)
            return
        }
        // console.log('drill entry:', item.data)
        postData(item)
    })

    const { mutate: postData, isLoading: postLoading } = useMutation(postItem, {
        onSuccess: (data) => {
            setLoading(true)
            queryClient.setQueryData(['cycleDetails'], data);
            reset()
            setTempData({})
            loadData()
            setIsModalOpen(false)
            setSubmitLoading(false)
            setLoading(false)
        },
        onError: (error: any) => {
            setLoading(false)
            setSubmitLoading(false)
            if (error?.response.status === 409) {
                message.error(`Drill entry already exists for this data`)
            } else {
                message.error(`${error}`)
            }
        }
    })


    return (
        <div className="card-custom card-flush" >
            <div className="card-header mt-7" style={{ borderBottom: 'none' }}>
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
                        dataSource={gridData}
                        scroll={{ x: 1300 }}
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
                                onSubmit={isUpdateModalOpen ? handleUpdate : OnSubmit} />
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
                                        {...register("rigId")}
                                        value={isUpdateModalOpen == true ? tempData.rigId : null}
                                        onChange={handleChange}
                                        className="form-select form-select-solid form-control-solid border border-gray-300"
                                        aria-label="Select example">
                                         {isUpdateModalOpen === false ? <option value="Select">Select</option> : null}
                                        {
                                            allRigs?.data.map((item: any) => (
                                                <option
                                                    value={item.equipmentId}>{item.equipmentId}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>
                            <div style={{ padding: "20px 20px 0 20px" }} className='row mb-3'>

                                <div className='col-6'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500 ">Shift</label>
                                    <select
                                        {...register("shiftId")}
                                        value={isUpdateModalOpen === true ? tempData?.shiftId : null}
                                        onChange={handleChange}
                                        className="form-select form-select-solid form-control-solid border border-gray-300" aria-label="Select example">
                                        {isUpdateModalOpen === false ? <option value="Select">Select</option> : null}
                                        {
                                            allShifts?.data.map((item: any) => (
                                                <option
                                                    value={item.id}>{item.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className='col-6'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500 ">Activity</label>
                                    <select
                                        {...register("activityMappingId")}
                                        onChange={handleChange}
                                        className="form-select form-select-solid form-control-solid border border-gray-300" aria-label="Select example">
                                        {isUpdateModalOpen === false ? <option value="Select">Select</option> : null}
                                        {
                                            activityMapping?.map((item: any) => (
                                                <option
                                                    selected={isUpdateModalOpen && `${item?.activity.id}-${item?.subActivity.id}` === `${tempData?.activityId}-${tempData?.activityDetailId}`}
                                                    value={`${item?.activity.id}-${item?.subActivity.id}`}>{`${item?.activity.name} \u2192 ${item?.subActivity.name}`} </option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>
                            <div style={{ padding: "20px 20px 0 20px" }} className='row mb-7'>
                                <div className='col-6'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Meter Value</label>
                                    <input type="number" {...register("meterValue")} name="meterValue" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.meterValue} onChange={handleChange}
                                        className="form-control form-control-solid border border-gray-300" />
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

