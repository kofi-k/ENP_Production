import { Button, Divider, Input, Modal, Space, Table, TabsProps, Tag, Upload, UploadFile, UploadProps, message } from 'antd';
import moment from 'moment';
import { useEffect, useState } from "react";
import { set, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import * as XLSX from 'xlsx';
import { KTCardBody } from '../../../../../_metronic/helpers';
import { deleteItem, fetchDocument, postItem, updateItem } from '../../urls';
import {
    ColumnActionButtons,
    ModalFooterButtons, PageActionButtons, calculateVolumesByField,
    convertExcelDateToJSDate, convertExcelTimeToJSDate, excelDateToJSDate,
    extractDateFromTimestamp, extractTimeFromISOString, getDateFromDateString, groupByBatchNumber, roundOff,
    timeFormat, timeStamp
} from '../CommonComponents';
import { Tabs } from 'antd';
import { TableProps } from 'react-bootstrap';
import { UploadChangeParam } from 'antd/es/upload';
import { time } from 'console';
import { UploadOutlined } from '@ant-design/icons';



const CycleDetailsTable = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false) // to show the upload modal
    const [uploadedFile, setUploadedFile] = useState<any>(null)
    const [dataFromAddB, setDataFromAddB] = useState([])
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
    const [dataFromUpload, setDataFromUpload] = useState<any>([]) // to hold the data read from the uploaded file
    const { data: destinations } = useQuery('destinations', () => fetchDocument(`productionDestination/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allHaulerUnits } = useQuery('hauler', () => fetchDocument(`ProHaulerUnit/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allHaulerOperators } = useQuery('haulerOperator', () => fetchDocument(`HaulerOperator/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allLoaderUnits } = useQuery('allLoaders', () => fetchDocument(`ProLoaderUnit/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allLoaderOperators } = useQuery('LoaderOperator', () => fetchDocument(`LoaderOperator/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allOrigins } = useQuery('allOrigins', () => fetchDocument(`ProductionOrigin/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allMaterials } = useQuery('allMaterials', () => fetchDocument(`ProdRawMaterial/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allShifts } = useQuery('shifts', () => fetchDocument(`ProductionShift/tenant/${tenantId}`), { cacheTime: 5000 })

    let [batchVolumesByHauler, setBatchVolumesByHauler] = useState<any>([]) // to hold the volumes by hauler
    let [batchVolumesByLoader, setBatchVolumesByLoader] = useState<any>([]) // to hold the volumes by loader
    let [batchVolumesByOrigin, setBatchVolumesByOrigin] = useState<any>([]) // to hold the volumes by origin
    let [batchVolumesByDestination, setBatchVolumesByDestination] = useState<any>([]) // to hold the volumes by destination
    const [fileList, setFileList] = useState([]);
    const [fileName, setFileName] = useState('') // to hold the name of the uploaded file
    const [isConfirmSaveModalOpen, setIsConfirmSaveModalOpen] = useState(false) // to show the modal to confirm the save

    // state to hold added items that will be batched and saved 
    const [manualBatchData, setManualBatchData]: any = useState<any[]>([]);
    const [uploadDataToSave, setUploadDataToSave]: any = useState<any[]>([]) // to hold the data to be saved from the uploaded file
    const [itemToUpdate, setItemToUpdate] = useState<any>(null) // to hold the item to be updated
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

    const populateBatchData = (values: any) => {
        // group by hauler unit
        const groupedByHauler: any = {};
        values?.forEach((item: any) => {
            if (!groupedByHauler[item.haulerUnit.equipmentId]) {
                groupedByHauler[item.haulerUnit.equipmentId] = [];
            }
            groupedByHauler[item.haulerUnit.equipmentId].push(item);
        });

        const groupedByLoader: any = {};
        values?.forEach((item: any) => {
            if (!groupedByLoader[item.loaderUnit.equipmentId]) {
                groupedByLoader[item.loaderUnit.equipmentId] = [];
            }
            groupedByLoader[item.loaderUnit.equipmentId].push(item);
        });

        const groupedByOrigin: any = {};
        values?.forEach((item: any) => {
            if (!groupedByOrigin[item.origin.name]) {
                groupedByOrigin[item.origin.name] = [];
            }
            groupedByOrigin[item.origin.name].push(item);
        });

        const groupedByDestination: any = {};
        values?.forEach((item: any) => {
            if (!groupedByDestination[item.destination.name]) {
                groupedByDestination[item.destination.name] = [];
            }
            groupedByDestination[item.destination.name].push(item);
        });
        setBatchRowsCount(values.length)

        setBatchVolumesByDestination(calculateVolumesByField(groupedByDestination))
        setBatchVolumesByOrigin(calculateVolumesByField(groupedByOrigin))
        setBatchVolumesByLoader(calculateVolumesByField(groupedByLoader))
        setBatchVolumesByHauler(calculateVolumesByField(groupedByHauler))
    }

    const showBatchDataCheckModal = (values: any) => {
        setIsBatchDataCheckModalOpen(true)
        setIsCheckDataModalOpen(true)
        console.log('batchValues: ', values)
        populateBatchData(values)
    }

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

    const handleIsUploadModalCancel = () => {
        setIsUploadModalOpen(false)
        handleRemove()
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
        console.log('batchData: ', manualBatchData)
    }

    const { mutate: deleteData, isLoading: deleteLoading } = useMutation(deleteItem, {
        onSuccess: (data) => {
            queryClient.setQueryData(['cycleDetails', tempData], data);
            loadData()
        },
        onError: (error) => {
            console.log('delete error: ', error)
        }
    })

    function handleDelete(element: any) {
        const item = {
            url: 'cycleDetails',
            data: element
        }
        deleteData(item)
    }

    const removeItemFromBatchData = (itemToRemove: any) => {
        setManualBatchData((prevBatchData: any[]) => {
            const updatedBatchData: any = prevBatchData.filter((item) => item !== itemToRemove);
            setDataFromAddB(updatedBatchData)
            setRowCount(dataFromAddB.length)
            return updatedBatchData;
        });
    };

    const removeItemFromUploadBatchData = (itemToRemove: any) => {
        setUploadDataToSave((prevBatchData: any[]) => {
            const updatedBatchData: any = prevBatchData.filter((item) => item !== itemToRemove);
            setDataFromAddB(updatedBatchData)
            setRowCount(uploadDataToSave.length)
            return updatedBatchData;
        });
    };

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
                name = item.equipmentId
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

    const mainColumns: any = [
        {
            title: 'Date', dataIndex: 'cycleDate', key: 'date', fixed: 'left', width: 120,
            render: (text: any) => <span>{moment(text).format('YYYY-MM-DD')}</span>
        },
        {
            title: 'Shift', dataIndex: 'shiftId', width: 100,
            render: (text: any) => <span>{getRecordName(text, allShifts?.data)}</span>
        },
        {
            title: 'Time', dataIndex: 'cycleTime', width: 120,
            render: (text: any) => <span>{extractTimeFromISOString(text)}</span>
        },
        {
            title: 'Loader Unit', dataIndex: 'loaderUnitId', width: 150,
            render: (text: any) => <span>{getUnitRecordName(text, allLoaderUnits?.data)}</span>
        },
        { title: 'Loader Operator', dataIndex: 'loader', width: 150, },
        {
            title: 'Hauler Unit', dataIndex: 'haulerUnitId', width: 150,
            render: (text: any) => <span>{getUnitRecordName(text, allHaulerUnits?.data)}</span>
        },
        { title: 'Hauler Operator', dataIndex: 'hauler', width: 150, },
        {
            title: 'Origin', dataIndex: 'originId', width: 150,
            render: (text: any) => <span>{getRecordName(text, allOrigins?.data)}</span>
        },
        {
            title: 'Material', dataIndex: 'materialId', width: 120,
            render: (text: any) => <span>{getRecordName(text, allMaterials?.data)}</span>
        },
        {
            title: 'Destination', dataIndex: 'destinationId', width: 150,
            render: (text: any) => <span>{getRecordName(text, destinations?.data)}</span>
        },
        {
            title: 'Nominal Weight', dataIndex: 'nominalWeight', width: 150,
            render: (text: any) => <span>{text.toLocaleString()}</span>
        },
        {
            title: 'Weight', dataIndex: 'weight', width: 100,
            render: (text: any) => <span>{text.toLocaleString()}</span>
        },
        {
            title: 'Payload Weight', dataIndex: 'payloadWeight', width: 150,
            render: (text: any) => <span>{text.toLocaleString()}</span>
        },
        {
            title: 'Reported Weight', dataIndex: 'reportedWeight', width: 150,
            render: (text: any) => <span>{text.toLocaleString()}</span>
        },
        {
            title: 'Volume', dataIndex: 'volumes', width: 100,
            render: (text: any) => <span>{text.toLocaleString()}</span>
        },
        {
            title: 'Loads', dataIndex: 'loads', width: 100,
            render: (text: any) => <span>{text.toLocaleString()}</span>
        },
        {
            title: 'Time at loader', dataIndex: 'timeAtLoader', width: 150,
            render: (text: any) => <span>{extractTimeFromISOString(text)}</span>
        },
        {
            title: 'Duration', dataIndex: 'duration', width: 150,
            render: (text: any) => <span>{text.toLocaleString()}</span>
        },
        {
            title: 'Action',
            fixed: 'right',
            width: 180,
            render: (_: any, record: any) => (
                <Space size='middle'>
                    <a onClick={() => showUpdateModal(record)} className='btn btn-light-info btn-sm'>
                        Update
                    </a>
                    <a onClick={() => isFileUploaded ? removeItemFromUploadBatchData(record) : removeItemFromBatchData(record)} className='btn btn-light-success btn-sm'>
                        Delete
                    </a>
                </Space>
            ),

        },
    ]

    const columns: any = [
        {
            title: 'Date',
            dataIndex: 'date',
        },
        {
            title: 'BatchNumber',
            dataIndex: 'batchNumber',
        },
        {
            title: 'Items',
            dataIndex: 'itemsCount',
            render: (text: any) => <Tag color="geekblue">{text} {text > 1 ? 'records' : 'record'} </Tag>
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


    // convert populated data from excel file to database 
    const saveTableObjects = () => {
        setLoading(true)
        try {
            const dateStamp = new Date().getTime()
            const dataToSaveWithDateStamp = uploadDataToSave
                .filter((data: any) => data !== null && data !== undefined)
                .map((obj: any) => {
                    setLoading(true)
                    return {
                        ...obj,
                        batchNumber: `${dateStamp}`
                    };
                });

            // const filteredSavedData = dataToSave.filter((data: any) => data !== null && data !== undefined)
            const item = {
                data: dataToSaveWithDateStamp,
                url: 'cycleDetails',
            }
            postData(item)
            message.success(
                `Saving ${dataToSaveWithDateStamp.length}  of ${uploadDataToSave.length} ${dataToSaveWithDateStamp.length > 1 ? 'records' : 'record'} of uploaded data`, 6
            )
            setIsFileUploaded(false)
            setIsConfirmSaveModalOpen(false)
            setDataFromUpload([])
            setUploadDataToSave([])
        } catch (err) {
            console.log('fileSaveError: ', err)
            setLoading(false)
        }
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

    const handleUpload = () => {

        const reader = new FileReader()
        try {
            setUploading(true)
            reader.onload = (e: any) => {

                const file = new Uint8Array(e.target.result)
                const workBook = XLSX.read(file, { type: 'array' })
                const workSheetName = workBook.SheetNames[0]
                const workSheet: any = workBook.Sheets[workSheetName]

                // sets the range to be read from the excel file
                const range = "A13:ZZ1200";

                const rawExcelData: any = XLSX.utils.sheet_to_json(workSheet, { header: 0, range: range, blankrows: false })

                let stopReading = false;
                const filteredData: any = rawExcelData
                    .map((item: any) => {

                        if (stopReading) {
                            return null; // Skip processing the remaining rows
                        }

                        const isTotalRow = item['Shift'] === 'Total' || item['Date'] === 'Total' ||
                            item['Time Start'] === 'Total';

                        if (isTotalRow) {
                            stopReading = true;
                            return null;
                        }

                        return {
                            cycleDate: `${item.Date}`,
                            shift: item['Shift'],
                            // cycleTime: moment(excelDateToJSDate(item['Arrived']), 'HH:mm:ss').format('HH:mm'),
                            cycleTime: item['Arrived'],
                            loaderUnit: item['Loading Unit'],
                            loader: item['Loader Operator'],
                            hauler: item['Hauler Operator'],
                            haulerUnit: item['Truck'],
                            origin: item['Origin'],
                            material: item['Material'],
                            destination: item['Destination'],
                            nominalWeight: item['Nominal Weight'],
                            payloadWeight: item['Payload Weight'],
                            reportedWeight: item['Reported Weight'],
                            volumes: roundOff(item.Volume),
                            loads: item['Loads'],
                            timeAtLoader: item['Time Start'],
                            // timeAtLoader: moment(excelDateToJSDate(item['Time Start']), 'HH:mm:ss').format('HH:mm'),
                            duration: item['Travel Empty Duration'],
                        }
                    }).filter((item: any) => item !== null);

                //log first 20 rows of filtered data
                console.log('filteredData: ', filteredData.slice(0, 20))

                const uploadableData = filteredData.slice(1).map((item: any,) => {

                    const destinationId = destinations?.data.find((dest: any) => dest.name.trim() === item.destination.trim());
                    const haulerUnitId = allHaulerUnits?.data.find((unit: any) => unit.equipmentId.trim() === item.haulerUnit.trim());
                    const hauler = allHaulerOperators?.data.find((op: any) => op.empName.trim() === item.hauler.trim());
                    const loaderUnitId = allLoaderUnits?.data.find((unit: any) => unit.equipmentId.trim() === item.loaderUnit.trim());
                    const loader = allLoaderOperators?.data.find((op: any) => op.empName.trim() === item.loader.trim());
                    const originId = allOrigins?.data.find((ori: any) => ori.name.trim() === item.origin.trim());
                    const materialId = allMaterials?.data.find((mat: any) => mat.name === item.material);
                    const shiftId = allShifts?.data.find((s: any) => s.name === item.shift);

                    if (!hauler) {

                    }

                    return {
                        cycleDate: convertExcelDateToJSDate(item.cycleDate).toISOString(),
                        cycleTime: convertExcelTimeToJSDate(item.cycleTime).toISOString(),
                        loader: loader?.empCode === undefined ? 'UN123' : loader?.empCode,
                        hauler: hauler?.empCode === undefined ? 'UN100' : hauler?.empCode,
                        loaderUnitId: parseInt(loaderUnitId?.id),
                        haulerUnitId: parseInt(haulerUnitId?.id),
                        originId: parseInt(originId?.id),
                        materialId: parseInt(materialId?.id),
                        destinationId: parseInt(destinationId?.id),
                        nominalWeight: parseInt(item.nominalWeight),
                        weight: parseInt(item.nominalWeight),
                        payloadWeight: parseInt(item.payloadWeight),
                        reportedWeight: parseInt(item.reportedWeight),
                        volumes: parseInt(item.volumes),
                        loads: parseInt(item.loads),
                        timeAtLoader: convertExcelTimeToJSDate(item.timeAtLoader).toISOString(),
                        shiftId: parseInt(shiftId?.id),
                        duration: parseInt(item.duration),
                        tenantId: tenantId,
                    }
                });
                console.log('uploadableData: ', uploadableData.slice(0, 20))
                handleRemove()
                setIsFileUploaded(true)
                setUploadDataToSave(uploadableData)
                setUploading(false)
                setIsUploadModalOpen(false)
                setRowCount(uploadableData.length)
                setDataFromUpload(uploadableData)
                // setUploadColumns(mainColumns)
            }
        } catch (error) {
            setIsUploadModalOpen(false)
        }
        reader.readAsArrayBuffer(uploadedFile)
    }

    // group by hauler unit
    const groupedByHauler: any = {};
    uploadDataToSave.forEach((item: any) => {
        if (!groupedByHauler[item.haulerUnitId]) {
            groupedByHauler[item.haulerUnitId] = [];
        }
        groupedByHauler[item.haulerUnitId].push(item);
    });

    // sum volumes per hauler
    const volumesByHauler = calculateVolumesByField(groupedByHauler);

    // group by loader unit
    const groupedByLoader: any = {};
    uploadDataToSave.forEach((item: any) => {
        if (!groupedByLoader[item.loaderUnitId]) {
            groupedByLoader[item.loaderUnitId] = [];
        }
        groupedByLoader[item.loaderUnitId].push(item);
    });

    // sum volumes per loader
    const volumesByLoader = calculateVolumesByField(groupedByLoader);


    // group by origin
    const groupedByOrigin: any = {};
    uploadDataToSave.forEach((item: any) => {
        if (!groupedByOrigin[item.originId]) {
            groupedByOrigin[item.originId] = [];
        }
        groupedByOrigin[item.originId].push(item);
    });

    // sum volumes per origin
    const volumesByOrigin = calculateVolumesByField(groupedByOrigin);


    // group by destination
    const groupedByDestination: any = {};
    uploadDataToSave.forEach((item: any) => {
        if (!groupedByDestination[item.destinationId]) {
            groupedByDestination[item.destinationId] = [];
        }
        groupedByDestination[item.destinationId].push(item);
    });

    // sum volumes per destination
    const volumesByDestination = calculateVolumesByField(groupedByDestination);

    // get record name from title
    const recordNameForDynamicColoumn = ( title: any, record: any, data: any ) => {
        let name = ''
        title === 'Hauler' || 'Loader' ? name = getUnitRecordName(record, data?.data) : name = getRecordName(record, data?.data)
        return name
    }
    // columns for checking data summary
    const dynamicColumns = (title: any, data: any) => {
        const columns = [
            {
                title: title, dataIndex: 'field',
                render: (record: any) => <span style={{ color: '#3699FF' }}>
                    {
                        recordNameForDynamicColoumn(
                         title, record, data
                        )
                    }
                </span>,
            },
            {
                title: 'Sum', children: [
                    { title: 'Volumes', dataIndex: 'sum', render: (value: any) => <span>{roundOff(value).toLocaleString()}</span> },
                    { title: 'Loads', dataIndex: 'sumLoads', render: (value: any) => <span>{roundOff(value).toLocaleString()}</span> },
                    { title: 'Nominal Weights', dataIndex: 'sumNominalWeights', render: (value: any) => <span>{roundOff(value).toLocaleString()}</span> },
                    { title: 'Payload Weights', dataIndex: 'sumPayloadWeights', render: (value: any) => <span>{roundOff(value).toLocaleString()}</span> },
                ]
            }
        ];
        return columns;
    }

    const summaryFooter = (data: any) => <Tag color="error">{data} rows </Tag>

    // tab view for data summaries
    const tabItems: TabsProps['items'] = [
        {
            key: '1', label: `Hauler Units`,
            children: (
                <><Table dataSource={isBatchDataCheckModalOpen ? batchVolumesByHauler : volumesByHauler} columns={dynamicColumns('Hauler', allHaulerUnits)}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(isBatchDataCheckModalOpen ? batchVolumesByHauler.length : volumesByHauler.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
        {
            key: '2', label: `Loader Units`,
            children: (
                <><Table dataSource={isBatchDataCheckModalOpen ? batchVolumesByLoader : volumesByLoader} columns={dynamicColumns('Loader', allLoaderUnits)}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(isBatchDataCheckModalOpen ? batchVolumesByLoader.length : volumesByLoader.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
        {
            key: '3', label: `Origins`, children: (
                <><Table dataSource={isBatchDataCheckModalOpen ? batchVolumesByOrigin : volumesByOrigin} columns={dynamicColumns('Origin', allOrigins)}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(isBatchDataCheckModalOpen ? batchVolumesByOrigin.length : volumesByOrigin.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
        {
            key: '4', label: `Destinations`, children: (
                <><Table dataSource={isBatchDataCheckModalOpen ? batchVolumesByDestination : volumesByDestination} columns={dynamicColumns('Destination', destinations)}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(isBatchDataCheckModalOpen ? batchVolumesByDestination.length : volumesByDestination.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
    ];


    //return count of rows per batch
    const countRowsPerBatch = (data: any) => {
        const groupedByBatchNumber = groupByBatchNumber(data);
        const batchNumbers = Object.keys(groupedByBatchNumber);
        const batchCount = batchNumbers.map((batchNumber: any) => {
            const records = groupedByBatchNumber[batchNumber]; // Get all records in the batch
            return {
                batchNumber: batchNumber,
                itemsCount: records.length,
                date: extractDateFromTimestamp(parseInt(batchNumber)),
                records: records // Include all records in the batch
            };
        });
        return batchCount;
    };

    const loadData = async () => {
        setLoading(true)
        try {
            setLoading(false)
        } catch (error) {
            setLoading(false)
            console.log(error)
            message.error(`${error}`)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const dataWithIndex = dataFromAddB.map((item: any, index) => ({
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
        // @ts-ignore
        filteredData = dataWithVehicleNum.filter((value) => {
            return (
                value.fleetID.toLowerCase().includes(searchText.toLowerCase()) ||
                value.modlName.toLowerCase().includes(searchText.toLowerCase())
            )
        })
        setDataFromAddB(filteredData)
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
            url: 'cycleDetails',
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
        setItemToUpdate(values)
    }

    const showBatchUpdateModal = (values: any) => {
        showModal()
        setIsUpdateModalOpen(true)
        setTempData(values);
        console.log(values)
    }


    const updateItemInBatchData = () => {
        isFileUploaded ?
            setUploadDataToSave((prevBatchData: any[]) => {
                const updatedBatchData: any = prevBatchData.map((item) =>
                    item === tempData ? tempData : item
                );
                console.log('uploadUpdate: ', updatedBatchData)
                setUploadDataToSave(updatedBatchData)
                setRowCount(updatedBatchData.length)
                handleCancel()
                return updatedBatchData;
            })
            :
            setManualBatchData((prevBatchData: any[]) => {
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


    //hide Update table 
    const clearUploadGrid = () => {
        setIsFileUploaded(false)
        setUploadedFile(null)
        setLoading(false)
        setRowCount(0)
    }


    const OnSubmit = handleSubmit(async (values) => {
        setSubmitLoading(true)
        const selectedDate = new Date(values.cycleDate);
        const item = {
            data: [
                {
                    cycleDate: selectedDate.toISOString(),
                    shiftId: parseInt(values.shiftId),
                    cycleTime: timeFormat(values.cycleTime).toISOString(),
                    loader: values.loader,
                    hauler: values.hauler,
                    haulerUnitId: parseInt(values.haulerUnitId),
                    loaderUnitId: parseInt(values.loaderUnitId),
                    originId: parseInt(values.originId),
                    materialId: parseInt(values.materialId),
                    destinationId: parseInt(values.destinationId),
                    nominalWeight: parseInt(values.nominalWeight),
                    weight: parseInt(values.weight),
                    payloadWeight: parseInt(values.payloadWeight),
                    reportedWeight: parseInt(values.reportedWeight),
                    volumes: parseInt(values.volumes),
                    loads: parseInt(values.loads),
                    timeAtLoader: timeFormat(values.timeAtLoader).toISOString(),
                    duration: parseInt(values.duration),
                    tenantId: tenantId,
                    batchNumber: `${Date.now()}`,
                },
            ],
            url: 'cycleDetails'
        }
        console.log(item.data)
        postData(item)

    })

    const handleAddItem = handleSubmit(async (values) => {
        // if date is not selected then show error message
        if (!values.cycleDate || !values.cycleTime || !values.timeAtLoader) {
            message.error('Please select date and time')
            return
        }
        const selectedDate = new Date(values.cycleDate);
        const data = {
            cycleDate: selectedDate.toISOString(),
            cycleTime: timeFormat(values.cycleTime).toISOString(),
            timeAtLoader: timeFormat(values.timeAtLoader).toISOString(),
            shiftId: parseInt(values.shiftId),
            loader: values.loader,
            hauler: values.hauler,
            haulerUnitId: parseInt(values.haulerUnitId),
            loaderUnitId: parseInt(values.loaderUnitId),
            originId: parseInt(values.originId),
            materialId: parseInt(values.materialId),
            destinationId: parseInt(values.destinationId),
            nominalWeight: parseInt(values.nominalWeight),
            weight: parseInt(values.weight),
            payloadWeight: parseInt(values.payloadWeight),
            reportedWeight: parseInt(values.reportedWeight),
            volumes: parseInt(values.volumes),
            loads: parseInt(values.loads),
            duration: parseInt(values.duration),
            tenantId: tenantId,
        }
        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === '' || value === 'Select' || value === undefined) {
                message.error(`Please fill in all fields`)
                setSubmitLoading(false)
                return
            }
        }
        isFileUploaded ? setUploadDataToSave((prevBatchData: any) => [...prevBatchData, data]) :
            setManualBatchData((prevBatchData: any) => [...prevBatchData, data])
        reset()
        // setGridData(batchData)
        setIsModalOpen(false)
        console.log('batch', manualBatchData)
    })

    const handleUpdateItem = handleSubmit(async (values) => {
        // if date is not selected then show error message
        if (!values.cycleDate || !values.cycleTime || !values.timeAtLoader) {
            message.error('Please select date and time')
            return
        }

    })

    useEffect(() => {
        console.log('batch', manualBatchData);
        if (manualBatchData.length > 0) {
            setDataFromAddB(manualBatchData)
        }
        setRowCount(manualBatchData.length)
    }, [manualBatchData]);

    useEffect(() => {
        console.log('dataToSave', uploadDataToSave.slice(0, 5));
        console.log('dataToSave length', uploadDataToSave.length);
        setRowCount(uploadDataToSave.length)
        setDataFromUpload(uploadDataToSave)
    }, [uploadDataToSave]);


    const clearBatchData = () => {
        setManualBatchData([])
        setDataFromAddB([])
    }

    const handleManualSave = () => {
        const dateStamp = new Date().getTime()
        console.log('batchData', manualBatchData)
        const batchDataWithDateStamp = manualBatchData.map((obj: any) => {
            setLoading(true)
            return {
                ...obj,
                batchNumber: `${dateStamp}`
            };
        });
        console.log('batchDataWithDateStamp', batchDataWithDateStamp)

        const item = {
            data: batchDataWithDateStamp,
            url: 'cycleDetails',
        };
        postData(item)
        clearBatchData()
        handleConfirmSaveCancel()
        setRowCount(0)
        setLoading(false)
    }

    const { mutate: postData, isLoading: postLoading } = useMutation(postItem, {
        onSuccess: (data) => {
            setLoading(true)
            queryClient.setQueryData(['cycleDetails'], data);
            message.success(`Batch saved successfully`);
            // setSavedCount(isFileUploaded ? savedCount + 1 : 0)
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
                    {
                        isFileUploaded ?
                            <>
                                <span className="fw-bold text-gray-800 d-block fs-3">Showing data read from {fileName}</span>
                            </> :
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
                <div className="card-toolbar">
                    <Space style={{ marginBottom: 16 }}>
                        {
                            isFileUploaded ?
                                <Space>
                                    <Button onClick={showCheckDataModal}
                                        type='primary' size='large'
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                        className='btn btn-light-success btn-sm'
                                    >
                                        Check data
                                    </Button>
                                    <Button onClick={handleSaveClicked}
                                        type='primary' size='large'
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }} className='btn btn-light-success btn-sm'>
                                        Save
                                    </Button>
                                    <Button onClick={clearUploadGrid}
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
                                <>
                                    <PageActionButtons
                                        onAddClick={showModal}
                                        onExportClicked={() => { console.log('export clicked') }}
                                        onUploadClicked={showUploadModal}
                                        hasAddButton={true}
                                        hasExportButton={manualBatchData.length < 1}
                                        hasUploadButton={manualBatchData.length < 1}
                                    />
                                    {
                                        manualBatchData.length > 0 &&
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
                                </>
                        }
                    </Space>
                </div>
            </div>
            <KTCardBody className='py-4 '>
                <div className='table-responsive'>
                    <div className='d-flex  justify-content-between'>

                    </div>

                    <Table
                        columns={mainColumns}
                        dataSource={isFileUploaded ? dataFromUpload : dataFromAddB}
                        scroll={{ x: 1300 }}
                        loading={loading}
                    />

                    <Modal
                        title={isUpdateModalOpen ? 'Update Cycle Details' : 'Cycle Details Setup'}
                        open={isModalOpen}
                        onCancel={isModalOpen ? handleCancel : handleCancel}
                        width={800}
                        closable={true}
                        footer={
                            <ModalFooterButtons
                                onCancel={handleCancel}
                                onSubmit={
                                    isUpdateModalOpen ? updateItemInBatchData : handleAddItem
                                }
                            />
                        }
                    >
                        <form onSubmit={isUpdateModalOpen ? updateItemInBatchData : handleAddItem}>
                            <Divider orientation="left">
                                Selectors
                            </Divider>
                            <div style={{ padding: "20px 20px 0 20px" }} className='row mb-0 '>
                                <div className='col-4'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Date</label>
                                    <input type="date" {...register("cycleDate")} name="cycleDate" defaultValue={!isUpdateModalOpen ? '' : getDateFromDateString(tempData?.cycleDate)} onChange={handleChange} className="form-control form-control-white" />
                                </div>
                                <div className='col-4'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Time</label>
                                    <input type="time" {...register("cycleTime")} name="cycleTime" defaultValue={!isUpdateModalOpen ? '' : extractTimeFromISOString(tempData?.cycleTime)} onChange={handleChange} className="form-control form-control-white" />
                                </div>

                                <div className='col-4'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Time at Loader</label>
                                    <input type="time" {...register("timeAtLoader")} name="timeAtLoader" defaultValue={!isUpdateModalOpen ? '' : extractTimeFromISOString(tempData?.timeAtLoader)} onChange={handleChange} className="form-control form-control-white" />
                                </div>
                            </div>
                            <div style={{ padding: "0 20px 0 20px" }} className='row mb-0 '>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Loader</label>
                                    <select
                                        {...register("loader")}
                                        onChange={handleChange}
                                        className="form-select form-select-white" aria-label="Select example">
                                        {!isUpdateModalOpen && <option>Select</option>}
                                        {
                                            allLoaderOperators?.data.map((item: any) => (
                                                <option
                                                    selected={isUpdateModalOpen && tempData.loader === item.empCode}
                                                    key={item.id} value={item.empCode}>{item.empName}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Hauler</label>
                                    <select
                                        {...register("hauler")}
                                        onChange={handleChange}
                                        className="form-select form-select-white" aria-label="Select example">
                                        {!isUpdateModalOpen && <option>Select</option>}
                                        {
                                            allHaulerOperators?.data.map((item: any) => (
                                                <option key={item.id}
                                                    selected={isUpdateModalOpen && tempData.hauler === item.empCode}
                                                    value={item.empCode}>{item.empName}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Origin</label>
                                    <select
                                        {...register("originId")}
                                        onChange={handleChange}
                                        className="form-select form-select-white" aria-label="Select example">
                                        {!isUpdateModalOpen && <option>Select</option>}
                                        {
                                            allOrigins?.data.map((item: any) => (
                                                <option selected={isUpdateModalOpen && item.id === tempData.originId} key={item.id} value={item.id}>{item.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>

                            <div style={{ padding: "0 20px 0 20px" }} className='row mb-0 '>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Hauler Unit</label>
                                    <select
                                        {...register("haulerUnitId")}
                                        onChange={handleChange}
                                        className="form-select form-select-white" aria-label="Select example">
                                        {!isUpdateModalOpen && <option>Select</option>}
                                        {
                                            allHaulerUnits?.data.map((item: any) => (
                                                <option key={item.id}
                                                    selected={isUpdateModalOpen && tempData.haulerUnitId === item.id}
                                                    value={item.id}>{item.equipmentId}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Loader Unit</label>
                                    <select
                                        {...register("loaderUnitId")}
                                        onChange={handleChange}
                                        className="form-select form-select-white" aria-label="Select example">
                                        {!isUpdateModalOpen && <option>Select</option>}
                                        {
                                            allLoaderUnits?.data.map((item: any) => (
                                                <option key={item.id}
                                                    selected={isUpdateModalOpen && tempData.loaderUnitId === item.id}
                                                    value={item.id}>{item.equipmentId}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Material</label>
                                    <select
                                        {...register("materialId")}
                                        onChange={handleChange}
                                        className="form-select form-select-white" aria-label="Select example">
                                        {!isUpdateModalOpen && <option>Select</option>}
                                        {
                                            allMaterials?.data.map((item: any) => (
                                                <option key={item.id}
                                                    selected={isUpdateModalOpen && tempData.materialId === item.id}
                                                    value={item.id}>{item.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                            </div>
                            <div style={{ padding: "0 20px 0 20px" }} className='row mb-0 '>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Destination</label>
                                    <select
                                        {...register("destinationId")}
                                        onChange={handleChange}
                                        className="form-select form-select-white" aria-label="Select example">
                                        {!isUpdateModalOpen && <option>Select</option>}
                                        {
                                            destinations?.data.map((item: any) => (
                                                <option key={item.id}
                                                    selected={isUpdateModalOpen && tempData.destinationId === item.id}
                                                    value={item.id}>{item.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className='col-4  mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Shift</label>
                                    <select
                                        {...register("shiftId")}
                                        onChange={handleChange}
                                        className="form-select form-select-white" aria-label="Select example">
                                        {!isUpdateModalOpen && <option>Select</option>}
                                        {
                                            allShifts?.data.map((item: any) => (
                                                <option key={item.id}
                                                    selected={isUpdateModalOpen && tempData.shiftId === item.id}
                                                    value={item.id}>{item.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>
                            <Divider />
                            <div style={{ padding: "0 20px 0 20px" }} className='row mb-0 '>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Nominal Weight</label>
                                    <input type="number" {...register("nominalWeight")} name="nominalWeight" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.nominalWeight} onChange={handleChange} className="form-control form-control-white" />
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Weight</label>
                                    <input type="number" {...register("weight")} name="weight" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.weight} onChange={handleChange} className="form-control form-control-white" />
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Payload Weight</label>
                                    <input type="number" {...register("payloadWeight")} name="payloadWeight" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.payloadWeight} onChange={handleChange} className="form-control form-control-white" />
                                </div>
                            </div>
                            <div style={{ padding: "0 20px 0 20px" }} className='row mb-0 '>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Reported Weight</label>
                                    <input type="number" {...register("reportedWeight")} name="reportedWeight" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.reportedWeight} onChange={handleChange} className="form-control form-control-white" />
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Volume</label>
                                    <input type="number" {...register("volumes")} name="volumes" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.volumes} onChange={handleChange} className="form-control form-control-white" />
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Loads</label>
                                    <input type="number" {...register("loads")} name="loads" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.loads} onChange={handleChange} className="form-control form-control-white" />
                                </div>
                            </div>
                            <div style={{ padding: "0 20px 0 20px" }} className='row mb-0 '>

                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Duration</label>
                                    <input type="number" {...register("duration")} name="duration" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.duration} onChange={handleChange} className="form-control form-control-white" />
                                </div>
                            </div>
                        </form>
                    </Modal>

                    {/* Modal to upload file */}
                    <Modal
                        title='Upload Cycle Detail'
                        open={isUploadModalOpen}
                        onOk={onOkay}
                        confirmLoading={uploading}
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
                        title={isBatchDataCheckModalOpen ? 'Batch Summaries' : 'Data Summaries'}
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
                                    <Tag color="geekblue">{isBatchDataCheckModalOpen ? batchRowsCount : rowCount} records </Tag>
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
                                <Button onClick={rowCount > 1 ? handleManualSave : saveTableObjects}
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
            </KTCardBody >
        </div >
    )
}

export { CycleDetailsTable };

