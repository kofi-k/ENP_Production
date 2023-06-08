import React, { FC, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import TopBarProgress from 'react-topbar-progress-indicator';
import { getCSSVariableValue } from '../../../_metronic/assets/ts/_utils';
import { WithChildren } from '../../../_metronic/helpers';
import { PageLink, PageTitle } from '../../../_metronic/layout/core';
import { CycleDetailsTable } from "./components/entries/cycleDetails/CycleDetailsTable";
import { PlannedOutputTable } from "./components/entries/PlannedOutputTable";
import { EquipmentFuelTable } from './components/entries/fuel/EquipmentFuelTable';
import { ActivityStatsReport } from './components/report/ActivityStatsReport';
import { EquipmentKpiReport } from "./components/report/EquipmentKpi";
import { ProductionReportTable } from "./components/report/ProductionReports";
import { FuelReportTable } from "./components/report/fuel/CycleDetailsList";
import { ProductionDrill } from './components/setup/Drill';
import { ShiftPage } from './components/setup/ShiftPage';
import { ActivityDetails } from './components/setup/activity/ActivityDetails';
import { ActivityTable } from "./components/setup/activity/ActivityTable";
import { ProductionHauler } from './components/setup/hauler/Hauler';
import { ProductionLoader } from './components/setup/loader/Loader';
import { ProductionLocations } from './components/setup/locations/Locations';
import { ProductionMaterials } from './components/setup/materials/Materials';
import { DrillEntry } from './components/entries/DrillEntry';
import { ActivityDetails2 } from './components/setup/activity/ActivityDetails2';
import { CycleDetails } from './components/entries/cycleDetails/CycleDetails';

const accountBreadCrumbs: Array<PageLink> = [
  {
    title: 'Activiy',
    path: '/setup/activity/',
    isSeparator: false,
    isActive: false,
  },
  {
    title: 'Activiy Details',
    path: '/activity/activityDetails',
    isSeparator: true,
    isActive: false,
  },
]

const ProductionPage: React.FC = () => {
  return (
    <Routes>

      <Route
        path='/entries/*'
        element={
          <>
            {/*<ProductionHeader />*/}
            <Outlet />
          </>
        }
      >
        <Route
          path='cycle-details'
          element={
            <>
              <PageTitle>Cycle Details</PageTitle>
              {/*<Overview />*/}
              <CycleDetails />
            </>
          }
        />
        <Route
          path='planned-output'
          element={
            <>
              <PageTitle>Planned Output</PageTitle>
              <PlannedOutputTable />
            </>
          }
        />
        <Route
          path='fuel'
          element={
            <>
              <PageTitle>Fuel</PageTitle>
              <EquipmentFuelTable />
            </>
          }
        />
        <Route
          path='drill'
          element={
            <>
              <PageTitle>Drill Entry</PageTitle>
             <DrillEntry />
            </>
          }
        />
        <Route index element={<Navigate to='/dashboard' />} />
      </Route>
      <Route
        path='/setup/*'
        element={
          <>
            {/*<ProductionHeader />*/}
            <Outlet />
          </>
        }
      >
        <Route
          path='loader'
          element={
            <>
              <PageTitle>Loader</PageTitle>
              {/*<Overview />*/}
              <ProductionLoader />
            </>
          }
        />
        <Route
          path='hauler'
          element={
            <>
              <PageTitle>Hauler</PageTitle>
              {/*<Overview />*/}
              <ProductionHauler />
            </>
          }
        />
        <Route
          path='drill'
          element={
            <>
              <PageTitle>Drill Unit</PageTitle>
              <ProductionDrill />
            </>
          }
        />
        <Route
          path='locations'
          element={
            <>
              <PageTitle>Locations</PageTitle>
              {/*<Overview />*/}
              <ProductionLocations />
            </>
          }
        />
        <Route
          path='materials'
          element={
            <>
              <PageTitle>Materials</PageTitle>
              <ProductionMaterials />
            </>
          }
        />
        <Route
          path='activity/*'
          element={
            <>
              <Outlet />
            </>
          }
        >
          <Route
            path=''
            element={
              <>
                <SuspensedView>
                  <PageTitle>Activity</PageTitle>
                  <ActivityTable />
                </SuspensedView>
              </>
            }
          />
          <Route
            path='activityDetails/:id'
            element={
              <SuspensedView>
                <PageTitle>Activity Details</PageTitle>
                <ActivityDetails />
              </SuspensedView>
            }
          />
        </Route>


        <Route
          path='shift'
          element={
            <>
              <PageTitle>Shift</PageTitle>
              <ShiftPage />
            </>
          }
        />
        <Route index element={<Navigate to='/dashboard' />} />
      </Route>
      <Route
        path='/report/*'
        element={
          <>
            <PageTitle>Production Report</PageTitle>
            {/*<Overview />*/}
            <ProductionReportTable />
          </>
        }
      >
        <Route
          path='production-report'
          element={
            <>
              <PageTitle breadcrumbs={accountBreadCrumbs}>Production Report</PageTitle>
              {/*<Overview />*/}
              <ProductionReportTable />
            </>
          }
        />
        <Route
          path='fuel-report'
          element={
            <>
              <PageTitle breadcrumbs={accountBreadCrumbs}>Fuel Report</PageTitle>
              <FuelReportTable />
            </>
          }
        />
        <Route
          path='equipment-kpi'
          element={
            <>
              <PageTitle breadcrumbs={accountBreadCrumbs}>Equipment KPI</PageTitle>
              <EquipmentKpiReport />
            </>
          }
        />
        <Route
          path='activity-statistics'
          element={
            <>
              <PageTitle breadcrumbs={accountBreadCrumbs}>Activity Statistics</PageTitle>
              <ActivityStatsReport />
            </>
          }
        />
        <Route index element={<Navigate to='/dashboard' />} />
      </Route>
    </Routes>
  )
}

const SuspensedView: FC<WithChildren> = ({ children }) => {
  const baseColor = getCSSVariableValue('--kt-primary')
  TopBarProgress.config({
    barColors: {
      '0': baseColor,
    },
    barThickness: 1,
    shadowBlur: 5,
  })
  return <Suspense fallback={<TopBarProgress />}>{children}</Suspense>
}

export default ProductionPage
