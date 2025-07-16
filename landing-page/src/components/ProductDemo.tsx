import BrowserWindow from './ProductDemo/BrowserWindow';
import CodeBlock from './ProductDemo/CodeBlock';
import DocumentationSection from './ProductDemo/DocumentationSection';
import DashboardMetrics from './ProductDemo/DashboardMetrics';
import DocumentationHealth from './ProductDemo/DocumentationHealth';
import ActivityInsights from './ProductDemo/ActivityInsights';
import ActivityFeed from './ProductDemo/ActivityFeed';

const ProductDemo = () => {
  return (
    <section className="py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-primary">Product Demo</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            See Lexicode in action
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            From code to documentation in seconds. Here's how Lexicode transforms your development workflow.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <CodeBlock title="Your Code" />
          
          <BrowserWindow title="Generated Documentation">
            <DocumentationSection />
          </BrowserWindow>
        </div>

        <div className="mt-16">
          <BrowserWindow title="Lexicode Dashboard">
            <div className="p-8">
              <DashboardMetrics />
              
              <div className="grid gap-6 lg:grid-cols-2 mb-8">
                <DocumentationHealth />
                <ActivityInsights />
              </div>
              
              <ActivityFeed />
            </div>
          </BrowserWindow>
        </div>
      </div>
    </section>
  )
}

export default ProductDemo