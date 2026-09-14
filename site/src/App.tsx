import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { StackWall } from './components/StackWall'
import { ArchitectureSection } from './components/ArchitectureSection'
import { LayersSection } from './components/LayersSection'
import { ImagesSection } from './components/ImagesSection'
import { ObjectsSection } from './components/ObjectsSection'
import { MeshSection } from './components/MeshSection'
import { ManifestsSection } from './components/ManifestsSection'
import { JourneySection } from './components/JourneySection'
import { BrokersSection } from './components/BrokersSection'
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
        <ArchitectureSection />
        <LayersSection />
        <ImagesSection />
        <ObjectsSection />
        <MeshSection />
        <ManifestsSection />
        <JourneySection />
        <BrokersSection />
        <ObservabilitySection />
        <InstallSection />
        <CommandsSection />
      </main>
      <Footer />
    </>
  )
}
