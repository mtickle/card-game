import { useAuth0 } from '@auth0/auth0-react';
const Header = () => {
    const { loginWithRedirect, logout, isAuthenticated, user, isLoading } = useAuth0();

    return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 shadow-md flex justify-between items-center rounded-t-2xl">
            <h1 className="text-2xl font-semibold tracking-tight">🎲 Card Breaker AI Lab</h1>
            <div>
                {isAuthenticated ? (
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                            Welcome, {user.name || user.email}
                        </span>
                        <button
                            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white text-sm shadow-md transition-all"
                        >
                            Log Out
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => loginWithRedirect()}
                        className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg text-white text-sm shadow-md transition-all"
                    >
                        Log In
                    </button>
                )}
            </div>
        </div>
    );
}


export default Header;