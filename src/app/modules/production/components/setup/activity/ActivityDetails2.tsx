import { Button, Input, Modal, Space, Table, UploadProps, message } from "antd"
import { useEffect, useState } from 'react'
import { useForm } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "react-query"
import { KTCardBody } from "../../../../../../_metronic/helpers"
import { deleteItem, fetchDocument, postItem, updateItem } from "../../../urls"
import { ModalFooterButtons, PageActionButtons, getDateFromDateString } from "../../CommonComponents"
import { ArrowLeftOutlined } from "@ant-design/icons"
import { useNavigate, useParams } from "react-router-dom"


const ActivityDetails2 = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false) // to show the upload modal
  const [uploadedFile, setUploadedFile] = useState<any>(null)
  const [gridData, setGridData] = useState([])
  const [searchText, setSearchText] = useState('')
  const [isFileUploaded, setIsFileUploaded] = useState(false) // to check if the file is uploaded
  const tenantId = localStorage.getItem('tenant')
  const [savedCount, setSavedCount] = useState(0) // to hold the number of rows saved from the uploaded file

  const [loading, setLoading] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false) //  to show the update modal
  const [tempData, setTempData] = useState<any>()
  const { register, reset, handleSubmit } = useForm()
  const queryClient = useQueryClient()
  const [detailName, setDetailName] = useState('')
  const navigate = useNavigate();
  const { data: allRigs } = useQuery('rigs', () => fetchDocument(`ProDrill/tenant/${tenantId}`), { cacheTime: 5000 })
  const { data: activities } = useQuery('activities', () => fetchDocument(`ProductionActivity/tenant/${tenantId}`), { cacheTime: 5000 })
  const param: any = useParams();



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


  const handleCancel = () => {
    reset()
    setIsModalOpen(false)
    setIsUpdateModalOpen(false)
    setTempData(null)
    setIsUploadModalOpen(false)
    setIsFileUploaded(false)
    setUploadedFile(null)
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
      title: 'Reporting Date',
      dataIndex: 'reportingDate',
      fixed: 'left',
      width:150,
      render: (text: any) => getDateFromDateString(text),
    },
    {
      title: 'Rig',
      dataIndex: 'drillId',
      width:150,
    },
    {
      title: 'Prod. Holes/Depth',
      dataIndex: 'production',
      width:150,
    },
    {
      title: 'Buffer Hole/Depth',
      dataIndex: 'buffer', 
      width:150,
    },
    {
      title: 'Pre-Split Hole/Depth',
      dataIndex: 'preSplit', 
      width:150,
    },
    {
      title: 'Miscellaneous (toe and pops)',
      dataIndex: 'miscellaneous', 
      width:150,
    },
    {
      title: 'Re-Drill Hole/Depth',
      dataIndex: 'reDrill', 
      width:150,
    },
    {
      title: 'Flush Hole/Depth',
      dataIndex: 'flush', 
      width:150,
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
        </Space>
      ),
    },
  ]

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetchDocument(`proDrillEntry/tenant/${tenantId}`)
      setGridData(response?.data)
      const getActivity = activities?.data.find((item: any) => item.id.toString() === param.id)
      const detName = getActivity?.name
      setDetailName(detName)
      console.log('detName: ', detName)
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
    const selectedDate = new Date(values.drillDate);
    const item = {
      data: {
        reportingDate: selectedDate.toISOString(),
        drillId: parseInt(values.drillId),
        production: parseInt(values.production),
        buffer: parseInt(values.buffer),
        preSplit: parseInt(values.preSplit),
        miscellaneous: parseInt(values.miscellaneous),
        reDrill: parseInt(values.reDrill),
        flush: parseInt(values.flush),
        tenantId: `${tenantId}`,
      },
      url: 'proDrillEntry'
    }
    // check if any property of data is negative then show error
    if (item.data.production < 0 || item.data.buffer < 0 || item.data.preSplit < 0 || item.data.miscellaneous < 0 || item.data.reDrill < 0 || item.data.flush < 0) {
      message.error('Please enter positive values')
      return
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
      setLoading(false)
    },
    onError: (error) => {
      setLoading(false)
      console.log('post error: ', error)
      message.error(`${error}`)
    }
  })


  return (
    <div className='card border border-gray-400 '
      style={{
        backgroundColor: 'white',
        paddingTop: '20px',
        borderRadius: '5px',
        boxShadow: '2px 2px 15px rgba(0,0,0,0.08)',
      }}
    >
      <KTCardBody className='py-4 '>
        <div className='table-responsive'>
          <div className="mb-5">
            <Space>
              <Button
                onClick={() => navigate(-1)}
                className="btn btn-light-primary me-3"
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  display: 'flex',
                }}
                type="primary" shape="circle" icon={<ArrowLeftOutlined rev={''} />} size={'large'} />
              <span className="fw-bold text-gray-800 d-block fs-2">{detailName}</span>
            </Space>
          </div>
          <div className='d-flex justify-content-between'>

            <Space style={{ marginBottom: 16 }}>
              <Input
                placeholder='Enter Search Text'
                onChange={handleInputChange}
                type='text'
                allowClear
                value={searchText}
                size='large'
              />
              <Button type='primary' onClick={globalSearch} size='large'>
                Search
              </Button>
            </Space>
            <Space style={{ marginBottom: 16 }}>
              <PageActionButtons
                onAddClick={showModal}
                onExportClicked={() => { console.log('export clicked') }}
                hasAddButton={true}
                hasExportButton={true}
              />
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={[]}
            scroll={isFileUploaded ? { x: 1300 } : {}}
            loading={loading}
          />

          <Modal
            title={isUpdateModalOpen ? 'Update Activity Detail' : 'Activity Detail Setup'}
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

                <div className='col-6'>
                  <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Date</label>
                  <input type="date" {...register("reportingDate")} name="reportingDate"
                    defaultValue={!isUpdateModalOpen ? '' : getDateFromDateString(tempData?.drillDate)} onChange={handleChange}
                    className="form-control form-control-solid border border-gray-300" />
                </div>
              </div>
              <div style={{ padding: "20px 20px 0 20px" }} className='row mb-7'>

                <div className='col-6'>
                  <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Production Holes/Depth</label>
                  <input type="number" {...register("production")} name="production" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.production} onChange={handleChange}
                    className="form-control form-control-solid border border-gray-300" />
                </div>
                <div className='col-6'>
                  <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Buffer Holes/Depth</label>
                  <input type="number" {...register("buffer")} name="buffer" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.production} onChange={handleChange}
                    className="form-control form-control-solid border border-gray-300" />
                </div>
              </div>
              <div style={{ padding: "20px 20px 0 20px" }} className='row mb-7'>

                <div className='col-6'>
                  <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Pre-Split</label>
                  <input type="number" {...register("preSplit")} name="preSplit" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.preSplit} onChange={handleChange}
                    className="form-control form-control-solid border border-gray-300" />
                </div>
                <div className='col-6'>
                  <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Miscellaneous (toe and pops)</label>
                  <input type="number" {...register("miscellaneous")} name="miscellaneous" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.miscellaneous} onChange={handleChange}
                    className="form-control form-control-solid border border-gray-300" />
                </div>
              </div>
              <div style={{ padding: "20px 20px 0 20px" }} className='row mb-7'>

                <div className='col-6'>
                  <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Re-Drill Holes/Depth</label>
                  <input type="number" {...register("reDrill")} name="reDrill" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.reDrill} onChange={handleChange}
                    className="form-control form-control-solid border border-gray-300" />
                </div>
                <div className='col-6'>
                  <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Flush Holes/Depth</label>
                  <input type="number" {...register("flush")} name="flush" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.flush} onChange={handleChange}
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

export { ActivityDetails2 }

