import { UploadOutlined } from '@ant-design/icons';
import { Button, Divider, Input, Modal, Space, Table, Tabs, TabsProps, Tag, Upload, UploadProps, message } from 'antd';
import moment from 'moment';
import { useEffect, useState } from "react";
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import * as XLSX from 'xlsx';
import { KTCardBody } from '../../../../../_metronic/helpers';
import { deleteItem, fetchDocument, postItem, updateItem } from '../../urls';
import {
    ModalFooterButtons, PageActionButtons, calculateVolumesByField,
    convertExcelDateToJSDate, convertExcelTimeToJSDate, excelDateToJSDate,
    extractDateFromTimestamp, groupByBatchNumber, roundOff,
    timeFormat
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

    const handleChange = (event: any) => {
        event.preventDefault()
        // if (event.target.name === 'cycleDate') {
        //     const selectedDate = new Date(event.target.value);
        //     const isoDate = selectedDate.toISOString();
        //     // Use the isoDate value as needed
        //   }
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

        // setBatchVolumesByDestination(calculateVolumesByField(groupedByDestination))
        // setBatchVolumesByOrigin(calculateVolumesByField(groupedByOrigin))
        // setBatchVolumesByLoader(calculateVolumesByField(groupedByLoader))
        // setBatchVolumesByHauler(calculateVolumesByField(groupedByHauler))
        
    }

    const showBatchDataCheckModal = (values: any) => {
        setIsBatchDataCheckModalOpen(true)
        setIsCheckDataModalOpen(true)
        console.log('batchValues: ', values)
        populateBatchData(values)
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

    const uploadFileColumns = [
        {
            title: 'Cyce Date', dataIndex: 'cycleDate', key: 'date', fixed: 'left', width: 120,
            render: (text: any) => moment(excelDateToJSDate(text), 'YYYY-MM-DD').format('YYYY-MM-DD')
        },
        { title: 'Shift', dataIndex: 'shift', width: 100 },
        { title: 'Time Start', dataIndex: 'timeAtLoader', width: 120 },
        { title: 'Loader Unit', dataIndex: 'loaderUnit', width: 150 },
        { title: 'Loader Operator', dataIndex: 'loader', width: 150 },
        { title: 'Hauler Unit', dataIndex: 'haulerUnit', width: 100 },
        { title: 'Hauler Operator', dataIndex: 'hauler', width: 150 },
        { title: 'Origin', dataIndex: 'origin', width: 150 },
        { title: 'Material', dataIndex: 'material', width: 120 },
        { title: 'Destination', dataIndex: 'destinationId', width: 150 },
        { title: 'Nominal Weight', dataIndex: 'nominalWeight', width: 150 },
        { title: 'Payload Weight', dataIndex: 'payloadWeight', width: 150 },
        { title: 'Reported Weight', dataIndex: 'reportedWeight', width: 150 },
        { title: 'Volume', dataIndex: 'volumes', width: 100 },
        { title: 'Loads', dataIndex: 'loads', width: 100 },
        { title: 'Cycle Time', dataIndex: 'cycleTime', width: 100 },
        { title: 'Duration', dataIndex: 'duration', width: 150, render: (text: any) => <span>{text.toLocaleString()}</span>  },
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
            const filteredSavedData = dataToSave.filter((data: any) => data !== null && data !== undefined)
            const item = {
                data: filteredSavedData,
                url: 'cycleDetails',
            }
            postData(item)
            message.success(`Saving ${filteredSavedData.length}  of ${dataToSave.length} ${filteredSavedData.length > 1 ? 'records' : 'record'} of uploaded data`, 6)
            loadData()
            setIsFileUploaded(false)
            setUploadedFile(null)
            setUploadData([])
            setDataToSave([])
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
        const dateStamp = new Date().getTime()
        try {
            setUploading(true)
            reader.onload = (e: any) => {

                const file = new Uint8Array(e.target.result)
                const workBook = XLSX.read(file, { type: 'array' })
                const workSheetName = workBook.SheetNames[0]
                const workSheet: any = workBook.Sheets[workSheetName]

                // sets the range to be read from the excel file
                const range = "A13:ZZ1200";

                const data: any = XLSX.utils.sheet_to_json(workSheet, { header: 0, range: range, blankrows: false })

                let stopReading = false;
                const filteredData: any = data
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

                let timeStamp: any = dateStamp
                const saveData = filteredData.slice(1).map((item: any,) => {

                    const destinationId = destinations?.data.find((dest: any) => dest.name.trim() === item.destination.trim());
                    const haulerUnitId = allHaulerUnits?.data.find((unit: any) => unit.equipmentId.trim() === item.haulerUnit.trim());
                    const hauler = allHaulerOperators?.data.find((op: any) => op.empName.trim() === item.hauler.trim());
                    const loaderUnitId = allLoaderUnits?.data.find((unit: any) => unit.equipmentId.trim() === item.loaderUnit.trim());
                    const loader = allLoaderOperators?.data.find((op: any) => op.empName.trim() === item.loader.trim());
                    const originId = allOrigins?.data.find((ori: any) => ori.name.trim() === item.origin.trim());
                    const materialId = allMaterials?.data.find((mat: any) => mat.name === item.material);
                    const shiftId = allShifts?.data.find((s: any) => s.name === item.shift);

                    // check if the id of any of the data is not found 
                    // if (!destinationId || !haulerUnitId || !loaderUnitId || !originId) {
                    //     return
                    // } else {
                    return {
                        cycleDate: convertExcelDateToJSDate(item.cycleDate).toISOString(),
                        cycleTime: convertExcelTimeToJSDate(item.cycleTime).toISOString(),
                        loader: loader?.empCode,
                        hauler: hauler?.empCode,
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
                        batchNumber: `${timeStamp}`,
                    }
                    // }
                });
                console.log('saveData: ', saveData.slice(0, 20))
                handleRemove()
                setDataToSave(saveData)
                timeStamp = ''
                setUploading(false)
                setIsUploadModalOpen(false)
                setIsFileUploaded(true)
                setUploadData(filteredData.slice(1))
                setRowCount(filteredData.length)
                setUploadColumns(uploadFileColumns)
            }
        } catch (error) {
            setIsUploadModalOpen(false)
        }
        reader.readAsArrayBuffer(uploadedFile)
    }

    // group by hauler unit
    const groupedByHauler: any = {};
    uploadData.forEach((item: any) => {
        if (!groupedByHauler[item.haulerUnit]) {
            groupedByHauler[item.haulerUnit] = [];
        }
        groupedByHauler[item.haulerUnit].push(item);
    });

    // sum volumes per hauler
    const volumesByHauler = calculateVolumesByField(groupedByHauler, allHaulerUnits?.data, 'unitId');

    // group by loader unit
    const groupedByLoader: any = {};
    uploadData.forEach((item: any) => {
        if (!groupedByLoader[item.loaderUnit]) {
            groupedByLoader[item.loaderUnit] = [];
        }
        groupedByLoader[item.loaderUnit].push(item);
    });

    // sum volumes per loader
    const volumesByLoader = calculateVolumesByField(groupedByLoader, allLoaderUnits?.data, 'unitId');


    // group by origin
    const groupedByOrigin: any = {};
    uploadData.forEach((item: any) => {
        if (!groupedByOrigin[item.origin]) {
            groupedByOrigin[item.origin] = [];
        }
        groupedByOrigin[item.origin].push(item);
    });

    // sum volumes per origin
    const volumesByOrigin = calculateVolumesByField(groupedByOrigin, allOrigins?.data, 'originId');


    // group by destination
    const groupedByDestination: any = {};
    uploadData.forEach((item: any) => {
        if (!groupedByDestination[item.destination]) {
            groupedByDestination[item.destination] = [];
        }
        groupedByDestination[item.destination].push(item);
    });

    // sum volumes per destination
    const volumesByDestination = calculateVolumesByField(groupedByDestination, destinations?.data, 'destinationId');


    // columns for checking data summary
    const dynamicColumns = (title: any) => {
        const columns = [
            { title: title, dataIndex: 'field', render: (text: any) => <span style={{ color: '#3699FF' }}>{text}</span>, },
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
                <><Table dataSource={isBatchDataCheckModalOpen ? batchVolumesByHauler : volumesByHauler} columns={dynamicColumns('Hauler')}
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
                <><Table dataSource={isBatchDataCheckModalOpen ? batchVolumesByLoader : volumesByLoader} columns={dynamicColumns('Loader')}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(isBatchDataCheckModalOpen ? batchVolumesByLoader.length : volumesByLoader.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
        {
            key: '3', label: `Origins`, children: (
                <><Table dataSource={isBatchDataCheckModalOpen ? batchVolumesByOrigin : volumesByOrigin} columns={dynamicColumns('Origin')}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(isBatchDataCheckModalOpen ? batchVolumesByOrigin.length : volumesByOrigin.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
        {
            key: '4', label: `Destinations`, children: (
                <><Table dataSource={isBatchDataCheckModalOpen ? batchVolumesByDestination : volumesByDestination} columns={dynamicColumns('Destination')}
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
            const response = await fetchDocument(`cycleDetails/tenant/${tenantId}`)
            const data: any = countRowsPerBatch(response.data)
            setGridData(data)
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
        // @ts-ignore
        filteredData = dataWithVehicleNum.filter((value) => {
            return (
                value.fleetID.toLowerCase().includes(searchText.toLowerCase()) ||
                value.modlName.toLowerCase().includes(searchText.toLowerCase())
            )
        })
        setGridData(filteredData)
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
    }

    //hide Update table 
    const clearUpdateTable = () => {
        setIsFileUploaded(false)
        setUploadedFile(null)
        setLoading(false)
        loadData()
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
                    <div className='d-flex  justify-content-between'>

                    </div>

                    <Table
                        columns={[]}
                        dataSource={[]}
                        scroll={isFileUploaded ? { x: 1300 } : {}}
                        loading={loading}
                    />

                    <Modal
                        title={isUpdateModalOpen ? 'Update Cycle Details' : 'Cycle Details Setup'}
                        open={isModalOpen}
                        onCancel={handleCancel}
                        width={800}
                        closable={true}
                        footer={
                            <ModalFooterButtons
                                onCancel={handleCancel}
                                onSubmit={isUpdateModalOpen ? handleUpdate : OnSubmit} />
                        }
                    >
                        <form onSubmit={isUpdateModalOpen ? handleUpdate : OnSubmit}>
                            <Divider orientation="left">
                                Selectors
                            </Divider>
                            <div style={{ padding: "20px 20px 0 20px" }} className='row mb-0 '>
                                <div className='col-4'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Date</label>
                                    <input type="date" {...register("cycleDate")} name="cycleDate" defaultValue={!isUpdateModalOpen ? '' : tempData?.cycleDate} onChange={handleChange} className="form-control form-control-white" />
                                </div>
                                <div className='col-4'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Time</label>
                                    <input type="time" {...register("cycleTime")} name="cycleTime" defaultValue={!isUpdateModalOpen ? '' : tempData?.cycleTime} onChange={handleChange} className="form-control form-control-white" />
                                </div>

                                <div className='col-4'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Time at Loader</label>
                                    <input type="time" {...register("timeAtLoader")} name="timeAtLoader" defaultValue={!isUpdateModalOpen ? '' : tempData?.timeAtLoader} onChange={handleChange} className="form-control form-control-white" />
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
                                                    selected={isUpdateModalOpen && tempData.loaderNavigation?.empCode}
                                                    value={item.empCode}>{item.empName}</option>
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
                                                <option
                                                    selected={isUpdateModalOpen && tempData.haulerNavigation?.empCode}
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
                                                <option
                                                    selected={isUpdateModalOpen && tempData.origin?.name}
                                                    value={item.id}>{item.name}</option>
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
                                                <option
                                                    selected={isUpdateModalOpen && tempData.haulerUnit?.equipmentId}
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
                                                <option
                                                    selected={isUpdateModalOpen && tempData.loaderUnit?.equipmentId}
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
                                                <option
                                                    selected={isUpdateModalOpen && tempData.material?.name}
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
                                                <option
                                                    selected={isUpdateModalOpen && tempData.destination?.name}
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
                                                <option
                                                    selected={isUpdateModalOpen && tempData.shift?.name}
                                                    value={item.id}>{item.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>
                            <Divider orientation="left">
                                Inputs
                            </Divider>
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
                                    <input type="number" {...register("reportedWeight")} name="reported_weight" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.reportedWeight} onChange={handleChange} className="form-control form-control-white" />
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
                        <Divider/>
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

export { DrillEntry };

