import { OperatorComponent } from "../components/ProOperatorComponent"

const LoaderOperator = () => {
  const data = {
    url: 'loaderOperator' ,
    title: 'Loader Operator',
  }
  return (
    <OperatorComponent data={data} />
  )
}

export { LoaderOperator }

