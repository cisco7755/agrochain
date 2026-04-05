import { Leaf, Shield, Zap, Globe, Lock, QrCode, BarChart3, Users, ExternalLink } from 'lucide-react';

const TECH_STACK = [
  { name: 'Solidity 0.8.28', desc: 'Smart contracts on Ethereum/Polygon', color: 'bg-gray-800 text-white' },
  { name: 'Polygon Amoy', desc: 'Layer-2 testnet — low gas fees', color: 'bg-purple-600 text-white' },
  { name: 'FastAPI', desc: 'Python REST API backend', color: 'bg-teal-600 text-white' },
  { name: 'SQLAlchemy', desc: 'ORM + SQLite database', color: 'bg-blue-600 text-white' },
  { name: 'React + Vite', desc: 'Frontend SPA', color: 'bg-cyan-500 text-white' },
  { name: 'Tailwind CSS', desc: 'Utility-first styling', color: 'bg-sky-500 text-white' },
  { name: 'Hardhat', desc: 'Smart contract testing', color: 'bg-yellow-500 text-white' },
  { name: 'Web3.py', desc: 'Blockchain interaction', color: 'bg-orange-500 text-white' },
];

const FEATURES = [
  { icon: Shield, title: 'Immutable Records', desc: 'Every supply chain event is written to the Polygon blockchain and cannot be altered or deleted, providing a permanent, tamper-proof audit trail.', color: 'text-green-600 bg-green-50' },
  { icon: QrCode, title: 'QR Verification', desc: 'Each product gets a unique QR code encoding its verify URL. Consumers scan it to see the complete farm-to-fork journey in seconds.', color: 'text-blue-600 bg-blue-50' },
  { icon: Lock, title: 'Anti-Fraud', desc: 'Organic certifications, temperature logs, and custody transfers are all cryptographically signed — impossible to falsify without detection.', color: 'text-purple-600 bg-purple-50' },
  { icon: Zap, title: 'Low Gas Costs', desc: 'Deployed on Polygon Amoy (Layer-2), AgroChain achieves transaction costs below $0.001 — viable for small-scale farmers in developing economies.', color: 'text-amber-600 bg-amber-50' },
  { icon: Globe, title: 'Supply Chain Map', desc: 'Visualize the geographic journey of each product with an interactive Leaflet.js map showing every custody handoff location.', color: 'text-teal-600 bg-teal-50' },
  { icon: BarChart3, title: 'Cold Chain Analytics', desc: 'Temperature and humidity data from every event is charted over time, instantly revealing spoilage or cold chain violations.', color: 'text-indigo-600 bg-indigo-50' },
];

const REFS = [
  { num: 1, text: 'K. Demestichas et al. (2020). "Blockchain in Agriculture Traceability Systems: A Review." Applied Sciences.' },
  { num: 2, text: 'S. Saberi et al. (2019). "Blockchain technology and its relationships to sustainable supply chain management." Int\'l Journal of Production Research.' },
  { num: 3, text: 'N. M. Kumar et al. (2021). "Blockchain and IoT for Smart Farming: A Review." IEEE Access.' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-900 to-emerald-700 text-white px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl mb-6">
            <Leaf className="w-10 h-10 text-green-700" />
          </div>
          <h1 className="text-4xl font-bold mb-4">AgroChain</h1>
          <p className="text-xl text-green-100 mb-6 leading-relaxed max-w-2xl mx-auto">
            A Decentralized Framework for Traceability and Anti-Fraud in Organic Food Supply Chains using Ethereum Smart Contracts
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {['Polygon Amoy Testnet', 'Solidity 0.8.28', 'Layer-2 Scaling', 'Design Science Research'].map((tag) => (
              <span key={tag} className="px-3 py-1.5 bg-white/20 rounded-full font-medium">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">
        {/* Abstract */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Abstract</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <p className="text-gray-600 leading-relaxed text-base">
              The global food industry loses approximately <strong>$40 billion annually</strong> to food fraud, including adulteration, counterfeiting, and mislabeling. Traditional supply chain monitoring relies on centralized, paper-based, or siloed digital records which are vulnerable to manipulation and lack transparency.
            </p>
            <p className="text-gray-600 leading-relaxed text-base mt-4">
              AgroChain is a blockchain-based traceability framework designed to ensure data integrity <em>from farm to fork</em>. Utilizing the Ethereum blockchain and Solidity smart contracts, the system creates an immutable "Digital Twin" for agricultural products. The solution is deployed on the <strong>Polygon Amoy Testnet</strong> to demonstrate cost-effective Layer-2 scalability suitable for small-scale farmers in developing economies.
            </p>
          </div>
        </section>

        {/* Problem Statement */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Problem Statement</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-4">
            {[
              { title: 'The Trust Gap', desc: 'Information about food origin, safety, and handling is stored in centralized databases controlled by individual stakeholders. These ledgers are mutable — a dishonest distributor can alter temperature logs or falsify organic certificates.' },
              { title: 'The Consequence', desc: 'In E. coli outbreaks, health authorities often take weeks to trace contamination. Blanket recalls destroy tons of safe food and farmer livelihoods.' },
              { title: 'The Technical Gap', desc: 'High transaction costs (gas fees) on Ethereum mainnet hinder adoption. AgroChain addresses this with a Layer-2 (Polygon) implementation optimized for low-margin food products.' },
            ].map(({ title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-900">{title}</p>
                  <p className="text-gray-600 text-sm mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Technology Stack</h2>
          <div className="flex flex-wrap gap-3">
            {TECH_STACK.map(({ name, desc, color }) => (
              <div key={name} className={`${color} rounded-xl px-4 py-3`}>
                <p className="font-bold text-sm">{name}</p>
                <p className="text-xs opacity-80 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Methodology */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Methodology (DSR)</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <p className="text-gray-500 text-sm mb-5">The research follows a Design Science Research (DSR) approach:</p>
            <div className="space-y-4">
              {[
                { n: 1, title: 'Smart Contract Development', desc: 'Self-executing contracts in Solidity that automatically record changes in product ownership and status (harvest, ship, receive, certify).' },
                { n: 2, title: 'Simulation Environment', desc: 'Contracts deployed on Polygon Amoy Testnet (Layer-2) to simulate high-volume, low-cost transactions suitable for agriculture.' },
                { n: 3, title: 'Frontend Integration', desc: 'React.js web interface allowing users to scan a QR code and retrieve the full immutable product history from the blockchain.' },
                { n: 4, title: 'Security Analysis', desc: 'Unit testing using Hardhat to ensure smart contracts are resilient against common vulnerabilities like re-entrancy attacks.' },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-4">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">{n}</div>
                  <div>
                    <p className="font-bold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* References */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">References</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-3">
            {REFS.map(({ num, text }) => (
              <div key={num} className="flex gap-3 text-sm text-gray-600">
                <span className="font-bold text-green-700 flex-shrink-0">[{num}]</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
