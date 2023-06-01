import { SetupComponent } from "../components/DynamicComponent"


const FuelPump = () => {
    const data = {
      url: 'ProPump',
      title: 'Pump',
    }
  
    return (
      <SetupComponent data={data} hasDescription={false} hasDuration={false} />
    )
  }

  export { FuelPump }