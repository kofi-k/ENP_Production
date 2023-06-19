import { UploadOutlined } from '@ant-design/icons';
import { Button, Divider, Modal, Space, Table, Tabs, TabsProps, Tag, Upload, UploadProps, message } from 'antd';
import moment from 'moment';
import { useEffect, useState } from "react";
import { set, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import * as XLSX from 'xlsx';
import { KTCardBody } from '../../../../../../_metronic/helpers';
import { deleteItem, fetchDocument, postItem } from '../../../urls';
import {
    ModalFooterButtons, PageActionButtons, calculateVolumesByField,
    convertExcelDateToJSDate, convertExcelTimeToJSDate,
    extractDateFromTimestamp, extractTimeFromISOString, getDateFromDateString, groupByBatchNumber, roundOff,
    timeFormat
} from '../../CommonComponents';



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
    const tenantId = localStorage.getItem('tenant')
    const [rowCount, setRowCount] = useState(0) // to hold the number of rows read from the uploaded file

    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false) //  to show the update modal
    const [tempData, setTempData] = useState<any>()
    const { register, reset, handleSubmit } = useForm()
    const queryClient = useQueryClient()
    const { data: destinations } = useQuery('destinations', () => fetchDocument(`productionDestination/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allHaulerUnits } = useQuery('hauler', () => fetchDocument(`ProHaulerUnit/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allHaulerOperators } = useQuery('haulerOperator', () => fetchDocument(`HaulerOperator/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allLoaderUnits } = useQuery('allLoaders', () => fetchDocument(`ProLoaderUnit/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allLoaderOperators } = useQuery('LoaderOperator', () => fetchDocument(`LoaderOperator/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allOrigins } = useQuery('allOrigins', () => fetchDocument(`ProductionOrigin/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allMaterials } = useQuery('allMaterials', () => fetchDocument(`ProdRawMaterial/tenant/${tenantId}`), { cacheTime: 5000 })
    const { data: allShifts } = useQuery('shifts', () => fetchDocument(`ProductionShift/tenant/${tenantId}`), { cacheTime: 5000 })

    const [dataToUpdate, setDataToUpdate] = useState<any[]>([]) // to hold the data to be updated
    const [fileList, setFileList] = useState([]);
    const [fileName, setFileName] = useState('') // to hold the name of the uploaded file
    const [isConfirmSaveModalOpen, setIsConfirmSaveModalOpen] = useState(false) // to show the modal to confirm the save

    // state to hold added items that will be batched and saved 
    const [batchDataToSave, setBatchDataToSave]: any = useState<any[]>([]);
    const [uploadDataToSave, setUploadDataToSave]: any = useState<any[]>([]) // to hold the data to be saved from the uploaded file
    const [itemToUpdate, setItemToUpdate] = useState<any>(null) // to hold the item to be updated

    const handleChange = (event: any) => {
        event.preventDefault()
        const { name, value } = event.target;
        setTempData((prevTempData: any) => ({
            ...prevTempData,
            [name]: value,
        }));

        // if event is shiftId or haulerUnitId or loaderUnitId or originId or destinationId or materialId, 
        // or nominalWeight or payloadWeight or weight, or volumes or loads or duration or reportedWeight 
        // parse the value to int
        if (name === 'shiftId' || name === 'haulerUnitId' || name === 'loaderUnitId'
            || name === 'originId' || name === 'destinationId' || name === 'materialId'
            || name === 'nominalWeight' || name === 'payloadWeight' || name === 'weight'
            || name === 'volumes' || name === 'loads' || name === 'duration' || name === 'reportedWeight') {
            setTempData((prevTempData: any) => ({
                ...prevTempData,
                [name]: parseInt(value),
            }));
        }
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


    const handleCancel = () => {
        reset()
        setDataToUpdate([])
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
    }

    const handleConfirmSaveCancel = () => {
        setIsConfirmSaveModalOpen(false)
    }

    const handleSaveClicked = () => {
        setIsConfirmSaveModalOpen(true)
        // console.log('batchDataToSave: ', batchDataToSave)
    }

    const { mutate: deleteData, isLoading: deleteLoading } = useMutation(deleteItem, {
        onSuccess: (data) => {
            queryClient.setQueryData(['cycleDetails', tempData], data);
            loadData()
        },
        onError: (error) => {
            // console.log('delete error: ', error)
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
        setBatchDataToSave((prevBatchData: any[]) => {
            const updatedBatchData: any = prevBatchData.filter((item) => item !== itemToRemove);
            setDataFromAddB(updatedBatchData)
            setRowCount(dataFromAddB.length)
            return updatedBatchData;
        });
        message.success('Item removed from batch.')
    };

    // const removeItemFromUploadBatchData = (itemToRemove: any) => {
    //     setUploadDataToSave((prevBatchData: any[]) => {
    //         const updatedBatchData: any = prevBatchData.filter((item) => item !== itemToRemove);
    //         setDataFromAddB(updatedBatchData)
    //         setRowCount(uploadDataToSave.length)
    //         return updatedBatchData;
    //     });
    //     message.success('Item removed from batch.')
    // };

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
                    <a onClick={() => removeItemFromBatchData(record)} className='btn btn-light-success btn-sm'>
                        Delete
                    </a>
                </Space>
            ),

        },
    ]

    const uploadProps: UploadProps = {
        name: 'file',
        accept: '.xlsx, .xls, .csv,',
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


    // convert populated data from excel file to database 
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
                url: 'cycleDetails',
            }
            postData(item)
            message.success(
                `Saving ${dataToSaveWithDateStamp.length} ${dataToSaveWithDateStamp.length > 1 ? 'records' : 'record'} of batch data`, 6
            )
            // console.log('batchDataWithDateStamp', dataToSaveWithDateStamp.slice(0, 10))
            handleConfirmSaveCancel()
            setIsConfirmSaveModalOpen(false)
            setLoading(false)
            clearBatchData()
        } catch (err) {
            // console.log('fileSaveError: ', err)
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

                // console.log('filteredData: ', filteredData.slice(0, 20))

                const uploadableData = filteredData.slice(1).map((item: any,) => {

                    const destinationId = destinations?.data.find((dest: any) => dest.name.trim() === item.destination.trim());
                    const haulerUnitId = allHaulerUnits?.data.find((unit: any) => unit.equipmentId.trim() === item.haulerUnit.trim());
                    const hauler = allHaulerOperators?.data.find((op: any) => op.empName.trim() === item.hauler.trim());
                    const loaderUnitId = allLoaderUnits?.data.find((unit: any) => unit.equipmentId.trim() === item.loaderUnit.trim());
                    const loader = allLoaderOperators?.data.find((op: any) => op.empName.trim() === item.loader.trim());
                    const originId = allOrigins?.data.find((ori: any) => ori.name.trim() === item.origin.trim());
                    const materialId = allMaterials?.data.find((mat: any) => mat.name === item.material);
                    const shiftId = allShifts?.data.find((s: any) => s.name === item.shift);

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

                const batchSize = 100; // Set an appropriate batch size
                const ignoredRows: any[] = [];

                for (let i = 0; i < uploadableData.length; i += batchSize) {
                    const batchItems = uploadableData.slice(i, i + batchSize);

                    const existingItemsSet = new Set(batchDataToSave.map((item: any) => {
                        return `${item.cycleDate}-${item.cycleTime}-${item.loaderUnitId}-
                        ${item.haulerUnitId}-${item.originId}-${item.materialId}-${item.destinationId}-
                        ${item.nominalWeight}-${item.weight}-${item.payloadWeight}-${item.reportedWeight}-
                        ${item.volumes}-${item.loads}-${item.timeAtLoader}-${item.duration}`;
                    }
                    ));

                    const existingItems = batchItems.filter((item: any) => {
                        return existingItemsSet.has(`${item.cycleDate}-${item.cycleTime}-${item.loaderUnitId}-
                        ${item.haulerUnitId}-${item.originId}-${item.materialId}-${item.destinationId}-
                        ${item.nominalWeight}-${item.weight}-${item.payloadWeight}-${item.reportedWeight}-
                        ${item.volumes}-${item.loads}-${item.timeAtLoader}-${item.duration}`);
                    }
                    );

                    const newBatchItems = batchItems.filter((item: any) => {
                        return !existingItemsSet.has(`${item.cycleDate}-${item.cycleTime}-${item.loaderUnitId}-
                        ${item.haulerUnitId}-${item.originId}-${item.materialId}-${item.destinationId}-
                        ${item.nominalWeight}-${item.weight}-${item.payloadWeight}-${item.reportedWeight}-${item.volumes}-${item.loads}-${item.timeAtLoader}-${item.duration}`);
                    }
                    );

                    setBatchDataToSave((prev: any) => [...prev, ...newBatchItems]);
                    ignoredRows.push(...existingItems);
                }


                const ignoredRowCount = ignoredRows.length;
                if (ignoredRowCount > 0) {
                    message.info(`${ignoredRowCount} row(s) were ignored because they already exist.`);
                    setUploading(false)
                    setIsUploadModalOpen(false)
                    return
                }

                setUploading(false)
                setIsUploadModalOpen(false)
                message.success(`${uploadableData.length} rows uploaded from ${fileName}`)
                handleRemove()
            }

        } catch (error) {
            setIsUploadModalOpen(false)
        }
        reader.readAsArrayBuffer(uploadedFile)
    }

    // group by hauler unit
    const groupedByHauler: any = {};
    dataFromAddB.forEach((item: any) => {
        if (!groupedByHauler[item.haulerUnitId]) {
            groupedByHauler[item.haulerUnitId] = [];
        }
        groupedByHauler[item.haulerUnitId].push(item);
    });

    // sum volumes per hauler
    const volumesByHauler = calculateVolumesByField(groupedByHauler, allHaulerUnits?.data, 'unitId');

    // group by loader unit
    const groupedByLoader: any = {};
    dataFromAddB.forEach((item: any) => {
        if (!groupedByLoader[item.loaderUnitId]) {
            groupedByLoader[item.loaderUnitId] = [];
        }
        groupedByLoader[item.loaderUnitId].push(item);
    });

    // sum volumes per loader
    const volumesByLoader = calculateVolumesByField(groupedByLoader, allLoaderUnits?.data, 'unitId');

    // group by origin
    const groupedByOrigin: any = {};
    dataFromAddB.forEach((item: any) => {
        if (!groupedByOrigin[item.originId]) {
            groupedByOrigin[item.originId] = [];
        }
        groupedByOrigin[item.originId].push(item);
    });

    // sum volumes per origin
    const volumesByOrigin = calculateVolumesByField(groupedByOrigin, allOrigins?.data, 'originId');

    // group by destination
    const groupedByDestination: any = {};
    dataFromAddB.forEach((item: any) => {
        if (!groupedByDestination[item.destinationId]) {
            groupedByDestination[item.destinationId] = [];
        }
        groupedByDestination[item.destinationId].push(item);
    });

    // sum volumes per destination
    const volumesByDestination = calculateVolumesByField(groupedByDestination, destinations?.data, 'destinationId');

    // columns for checking data summary
    const dynamicColumns = (title: any, data: any) => {
        const columns = [
            {
                title: title, dataIndex: 'field',
                render: (record: any) => <span style={{ color: '#3699FF' }}>
                    {record}
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

    const summaryFooter = (data: any) => <Tag color="error">{data === 1 ? `${data} row` : `${data} rows`}</Tag>

    // tab view for data summaries
    const tabItems: TabsProps['items'] = [
        {
            key: '1', label: `Hauler Units`,
            children: (
                <><Table dataSource={volumesByHauler} columns={dynamicColumns('Hauler', allHaulerUnits)}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(volumesByHauler.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
        {
            key: '2', label: `Loader Units`,
            children: (
                <><Table dataSource={volumesByLoader} columns={dynamicColumns('Loader', allLoaderUnits)}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(volumesByLoader.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
        {
            key: '3', label: `Origins`, children: (
                <><Table dataSource={volumesByOrigin} columns={dynamicColumns('Origin', allOrigins)}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(volumesByOrigin.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
        {
            key: '4', label: `Destinations`, children: (
                <><Table dataSource={volumesByDestination} columns={dynamicColumns('Destination', destinations)}
                    pagination={{ pageSize: 20 }} scroll={{ y: 240 }}
                    footer={() => summaryFooter(volumesByDestination.length)}
                    bordered
                    size="middle"
                /></>
            ),
        },
    ];


    const loadData = async () => {
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
        // filteredData = dataWithVehicleNum.filter((value) => {
        //     return (
        //         value.fleetID.toLowerCase().includes(searchText.toLowerCase()) ||
        //         value.modlName.toLowerCase().includes(searchText.toLowerCase())
        //     )
        // })
        // setDataFromAddB(filteredData)
    }


    const showUpdateModal = (values: any) => {
        showModal()
        setIsUpdateModalOpen(true)
        setTempData(values);
        setItemToUpdate(values)
        setDataToUpdate(values)
    }


    const updateItemInBatchData = () => {
        setBatchDataToSave((prevBatchData: any[]) => {
            const updatedBatchData: any = prevBatchData.map((item) =>
                item === dataToUpdate ? tempData : item
            );
            // console.log('manualUpdate: ', updatedBatchData)
            setDataFromAddB(updatedBatchData)
            setRowCount(updatedBatchData.length)
            handleCancel()
            return updatedBatchData;
        })
    };


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
            // check for negative values
            if (key === 'nominalWeight' || key === 'weight' || key === 'payloadWeight' || key === 'reportedWeight' || key === 'volumes' || key === 'loads' || key === 'duration') {
                if (value < 0) {
                    message.error(`Please enter a positive number for ${key}`)
                    setSubmitLoading(false)
                    return
                }
            }
        }

        const itemExists = (batchData: any) => batchData.some((item: any) => {
            // Compare the properties that determine uniqueness
            return (
                item.cycleDate === data.cycleDate &&
                item.cycleTime === data.cycleTime &&
                item.timeAtLoader === data.timeAtLoader &&
                item.shiftId === data.shiftId &&
                item.loader === data.loader &&
                item.hauler === data.hauler &&
                item.haulerUnitId === data.haulerUnitId &&
                item.loaderUnitId === data.loaderUnitId &&
                item.originId === data.originId &&
                item.materialId === data.materialId &&
                item.destinationId === data.destinationId &&
                item.nominalWeight === data.nominalWeight &&
                item.weight === data.weight &&
                item.payloadWeight === data.payloadWeight &&
                item.reportedWeight === data.reportedWeight &&
                item.volumes === data.volumes &&
                item.loads === data.loads &&
                item.duration === data.duration
            );
        });

        if (itemExists(batchDataToSave)) {
            message.error('Item already exists');
            setSubmitLoading(false);
            return;
        }
        setBatchDataToSave((prevBatchData: any) => [...prevBatchData, data])
        setIsModalOpen(false)
        message.success('Item added to batch.')
        reset()
        // console.log('batchDataToSave', batchDataToSave)
    })

    const handleUpdateItem = handleSubmit(async (values) => {
        // Retrieve the index of the item to be updated
        const itemIndex = batchDataToSave.findIndex((item: any) => {
            // Compare the properties that determine uniqueness
            return (
                item.cycleDate === values.cycleDate &&
                item.cycleTime === values.cycleTime &&
                item.timeAtLoader === values.timeAtLoader &&
                item.shiftId === parseInt(values.shiftId) &&
                item.loader === values.loader &&
                item.hauler === values.hauler &&
                item.haulerUnitId === parseInt(values.haulerUnitId) &&
                item.loaderUnitId === parseInt(values.loaderUnitId) &&
                item.originId === parseInt(values.originId) &&
                item.materialId === parseInt(values.materialId) &&
                item.destinationId === parseInt(values.destinationId) &&
                item.nominalWeight === parseInt(values.nominalWeight) &&
                item.weight === parseInt(values.weight) &&
                item.payloadWeight === parseInt(values.payloadWeight) &&
                item.reportedWeight === parseInt(values.reportedWeight) &&
                item.volumes === parseInt(values.volumes) &&
                item.loads === parseInt(values.loads) &&
                item.duration === parseInt(values.duration)
            );
        });

        // If the item is found, update it
        if (itemIndex !== -1) {
            const updatedItem = {
                cycleDate: new Date(values.cycleDate).toISOString(),
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
            };

            // Update the item in the batchDataToSave array
            setBatchDataToSave((prevBatchData: any) => {
                const updatedBatchData = [...prevBatchData];
                updatedBatchData[itemIndex] = updatedItem;
                return updatedBatchData;
            });

            message.success('Item updated.');
            reset();
            // console.log('batchDataToSave', batchDataToSave);
        } else {
            message.error('Item not found.');
        }
    });


    useEffect(() => {
        // console.log('batch', batchDataToSave);
        if (batchDataToSave.length > 0) {
            setDataFromAddB(batchDataToSave)
        }
        setRowCount(batchDataToSave.length)
    }, [batchDataToSave]);

    const clearBatchData = () => {
        setBatchDataToSave([])
        setDataFromAddB([])
        setLoading(false)
        setRowCount(0)
    }


    const { mutate: postData, isLoading: postLoading } = useMutation(postItem, {
        onSuccess: (data) => {
            setLoading(true)
            queryClient.setQueryData(['cycleDetails'], data);
            message.success(`Batch saved successfully`);
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
            // console.log('batch post error: ', error)
            message.error(`${error}`)
        }
    })


    return (
        <div className="card-custom card-flush">
            <div className="card-header mt-0" style={{ borderBottom: 'none' }}>
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
                <div className="card-toolbar">
                    <Space style={{ marginBottom: 16 }}>
                        {
                            <>
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
                        dataSource={dataFromAddB}
                        scroll={{ x: 1300 }}
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
                                onSubmit={
                                    isUpdateModalOpen ? updateItemInBatchData : handleAddItem
                                }
                            />
                        }
                    >
                        <form onSubmit={isUpdateModalOpen ? updateItemInBatchData : handleAddItem}>
                            <Divider orientation="left" />
                            <div style={{ padding: "20px 20px 0 20px" }} className='row mb-0 '>
                                <div className='col-4'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Date</label>
                                    <input type="date" {...register("cycleDate")} name="cycleDate" defaultValue={!isUpdateModalOpen ? '' : getDateFromDateString(tempData?.cycleDate)} onChange={handleChange} className="form-control form-control-solid border border-gray-300" />
                                </div>
                                <div className='col-4'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Time</label>
                                    <input type="time" {...register("cycleTime")} name="cycleTime" defaultValue={!isUpdateModalOpen ? '' : extractTimeFromISOString(tempData?.cycleTime)} onChange={handleChange} className="form-control form-control-solid border border-gray-300" />
                                </div>

                                <div className='col-4'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Time at Loader</label>
                                    <input type="time" {...register("timeAtLoader")} name="timeAtLoader" defaultValue={!isUpdateModalOpen ? '' : extractTimeFromISOString(tempData?.timeAtLoader)} onChange={handleChange} className="form-control form-control-solid border border-gray-300" />
                                </div>
                            </div>
                            <div style={{ padding: "0 20px 0 20px" }} className='row mb-0 '>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Loader</label>
                                    <select
                                        {...register("loader")}
                                        value={isUpdateModalOpen === true ? tempData?.loader : null}
                                        onChange={handleChange}
                                        className="form-select form-select-solid border border-gray-300" aria-label="Select example">
                                        {isUpdateModalOpen === false ? <option value="Select">Select</option> : null}
                                        {
                                            allLoaderOperators?.data.map((item: any) => (
                                                <option
                                                    key={item.id} value={item.empCode}>{item.empName}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Hauler</label>
                                    <select
                                        {...register("hauler")}
                                        value={isUpdateModalOpen === true ? tempData?.hauler : null}
                                        onChange={handleChange}
                                        className="form-select form-select-solid border border-gray-300" aria-label="Select example">
                                        {isUpdateModalOpen === false ? <option value="Select">Select</option> : null}
                                        {
                                            allHaulerOperators?.data.map((item: any) => (
                                                <option key={item.id}
                                                    value={item.empCode}>{item.empName}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Origin</label>
                                    <select
                                        {...register("originId")}
                                        value={isUpdateModalOpen === true ? tempData?.originId : null}
                                        onChange={handleChange}
                                        className="form-select form-select-solid border border-gray-300" aria-label="Select example">
                                        {isUpdateModalOpen === false ? <option value="Select">Select</option> : null}
                                        {
                                            allOrigins?.data.map((item: any) => (
                                                <option
                                                    key={item.id} value={item.id}>{item.name}</option>
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
                                        value={isUpdateModalOpen === true ? tempData?.haulerUnitId : null}
                                        onChange={handleChange}
                                        className="form-select form-select-solid border border-gray-300" aria-label="Select example">
                                        {isUpdateModalOpen === false ? <option value="Select">Select</option> : null}
                                        {
                                            allHaulerUnits?.data.map((item: any) => (
                                                <option key={item.id}
                                                    value={item.id}>{item.equipmentId}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Loader Unit</label>
                                    <select
                                        {...register("loaderUnitId")}
                                        value={isUpdateModalOpen === true ? tempData?.loaderUnitId : null}
                                        onChange={handleChange}
                                        className="form-select form-select-solid border border-gray-300" aria-label="Select example">
                                        {isUpdateModalOpen === false ? <option value="Select">Select</option> : null}
                                        {
                                            allLoaderUnits?.data.map((item: any) => (
                                                <option key={item.id}
                                                    value={item.id}>{item.equipmentId}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Material</label>
                                    <select
                                        {...register("materialId")}
                                        value={isUpdateModalOpen === true ? tempData?.materialId : null}
                                        onChange={handleChange}
                                        className="form-select form-select-solid border border-gray-300" aria-label="Select example">
                                        {isUpdateModalOpen === false ? <option value="Select">Select</option> : null}
                                        {
                                            allMaterials?.data.map((item: any) => (
                                                <option key={item.id}
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
                                        value={isUpdateModalOpen === true ? tempData?.destinationId : null}
                                        onChange={handleChange}
                                        className="form-select form-select-solid border border-gray-300" aria-label="Select example">
                                        {isUpdateModalOpen === false ? <option value="Select">Select</option> : null}
                                        {
                                            destinations?.data.map((item: any) => (
                                                <option key={item.id}
                                                    value={item.id}>{item.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className='col-4  mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Shift</label>
                                    <select
                                        {...register("shiftId")}
                                        value={isUpdateModalOpen === true ? tempData?.shiftId : null}
                                        onChange={handleChange}
                                        className="form-select form-select-solid border border-gray-300" aria-label="Select example">
                                        {isUpdateModalOpen === false ? <option value="Select">Select</option> : null}
                                        {
                                            allShifts?.data.map((item: any) => (
                                                <option key={item.id}
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
                                    <input type="number" {...register("nominalWeight")} name="nominalWeight" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.nominalWeight} onChange={handleChange}
                                        className="form-control form-control-solid border border-gray-300" />
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Weight</label>
                                    <input type="number" {...register("weight")} name="weight" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.weight} onChange={handleChange}
                                        className="form-control form-control-solid border border-gray-300" />
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Payload Weight</label>
                                    <input type="number" {...register("payloadWeight")} name="payloadWeight" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.payloadWeight} onChange={handleChange}
                                        className="form-control form-control-solid border border-gray-300" />
                                </div>
                            </div>
                            <div style={{ padding: "0 20px 0 20px" }} className='row mb-0 '>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Reported Weight</label>
                                    <input type="number" {...register("reportedWeight")} name="reportedWeight" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.reportedWeight} onChange={handleChange}
                                        className="form-control form-control-solid border border-gray-300" />
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Volume</label>
                                    <input type="number" {...register("volumes")} name="volumes" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.volumes} onChange={handleChange}
                                        className="form-control form-control-solid border border-gray-300" />
                                </div>
                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Loads</label>
                                    <input type="number" {...register("loads")} name="loads" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.loads} onChange={handleChange}
                                        className="form-control form-control-solid border border-gray-300" />
                                </div>
                            </div>
                            <div style={{ padding: "0 20px 0 20px" }} className='row mb-0 '>

                                <div className='col-4 mt-3'>
                                    <label htmlFor="exampleFormControlInput1" className="required form-label text-gray-500">Duration</label>
                                    <input type="number" {...register("duration")} name="duration" min={0} defaultValue={!isUpdateModalOpen ? 0 : tempData?.duration} onChange={handleChange}
                                        className="form-control form-control-solid border border-gray-300" />
                                </div>
                            </div>
                        </form>
                    </Modal>

                    {/* Modal to upload file */}
                    <Modal
                        title='Upload Cycle Detail'
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
            </KTCardBody >
        </div >
    )
}

export { CycleDetailsTable };

