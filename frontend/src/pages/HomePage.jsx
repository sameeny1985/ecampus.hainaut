import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm w-full max-w-full">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-20 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-base sm:text-xl shrink-0">
              IETC
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base sm:text-lg text-gray-900 truncate">CampusConnect</div>
              <div className="text-xs text-gray-500 truncate">IETC Charleroi</div>
            </div>
          </div>
          <nav className="flex items-center gap-3 sm:gap-6 shrink-0">
            <Link to="/" className="hidden sm:inline text-gray-700 hover:text-blue-600 font-medium whitespace-nowrap">Accueil</Link>
            <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 sm:px-5 py-2 rounded-lg text-sm sm:text-base font-medium whitespace-nowrap shrink-0">
              Connexion
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16 grid md:grid-cols-2 gap-8 sm:gap-12 items-center min-w-0">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Bienvenue sur<br />
            <span className="text-blue-600">CampusConnect</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-gray-600">
            Le réseau social interne de l'IETC Charleroi.<br />
            Échangez, collaborez et restez informés au sein de votre établissement.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 rounded-lg font-medium text-base sm:text-lg whitespace-nowrap"
            >
              Se connecter
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Les comptes sont créés par l'administration de l'établissement.
          </p>
        </div>

        <div className="relative min-w-0">
          <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg px-4">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl mb-4">🏛️</div>
              <div className="text-lg sm:text-xl font-semibold text-blue-800">IETC Charleroi</div>
              <div className="text-xs sm:text-sm text-blue-600 mt-1">Institut d'Enseignement Technique de Charleroi</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16 w-full max-w-full">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">Fonctionnalités</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="text-4xl mb-3">📚</div>
              <h3 className="font-semibold text-lg">Communautés de cours</h3>
              <p className="text-gray-600 text-sm mt-2">Rejoignez les communautés de vos cours et échangez avec vos camarades.</p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="font-semibold text-lg">Messagerie</h3>
              <p className="text-gray-600 text-sm mt-2">Communiquez en privé avec les autres membres de l'établissement.</p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-3">📢</div>
              <h3 className="font-semibold text-lg">Actualités</h3>
              <p className="text-gray-600 text-sm mt-2">Restez informé des annonces et publications de votre établissement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        © {new Date().getFullYear()} CampusConnect — IETC Charleroi. Tous droits réservés.
      </footer>
    </div>
  )
}
