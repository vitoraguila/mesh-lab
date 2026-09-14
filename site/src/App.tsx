import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { StackWall } from './components/StackWall'
import { LayersSection } from './components/LayersSection'
import { ImagesSection } from './components/ImagesSection'
import { ObjectsSection } from './components/ObjectsSection'
import { MeshSection } from './components/MeshSection'
import { JourneySection } from './components/JourneySection'
import { ObservabilitySection } from './components/ObservabilitySection'
import { InstallSection } from './components/InstallSection'
import { CommandsSection } from './components/CommandsSection'
import { Footer } from './components/Footer'

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <StackWall />
        <LayersSection />
        <ImagesSection />
        <ObjectsSection />
        <MeshSection />
        <JourneySection />
        <ObservabilitySection />
        <InstallSection />
        <CommandsSection />
      </main>
      <Footer />
    </>
  )
}
