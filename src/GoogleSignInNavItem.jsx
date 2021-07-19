import React from 'react';
import {
    NavItem, Modal, Button, NavDropdown, MenuItem
} from 'react-bootstrap';
import withToast from './withToast.jsx';
import {useGoogleLogin, GoogleLogout} from 'react-google-login';

const clientId='1038127560252-l5to72bpo8p6pb4f2mieeljlkjpkgfte.apps.googleusercontent.com';

class GoogleSignInNavItem extends React.Component {
    constructor(props){
        super(props);
        this.state={
            showing: false,
            disabled: true,
            user: {signedIn: false, givenName: '' }
        }
        this.showModal=this.showModal.bind(this);
        this.hideModal=this.hideModal.bind(this);
        this.signIn=this.signIn.bind(this);
        this.signOut=this.signOut.bind(this);
        this.onSuccess=this.onSuccess.bind(this);
        this.onFailure=this.onFailure.bind(this);
    }

    async componentDidMount(){
        await this.loadData();
    }

    async loadData(){
        const apiEndpoint=window.ENV.UI_AUTH_ENDPOINT;
        const response=await fetch(`${apiEndpoint}/user`,{
            method: 'POST',
        });
        const body = await response.text();
        const result=JSON.parse(body);
        const {signedIn,givenName}=result;
        this.setState({user: {signedIn,givenName}});
    }

    async signOut(){
        const apiEndpoint=window.ENV.UI_AUTH_ENDPOINT;
        const {showError}=this.props;

        try{
            await fetch(`${apiEndpoint}/signout`,{
                method: 'POST',
            });


            this.setState({user: {signedIn: false, givenName: ''}});    
        } catch (error){
            showError(`Error signing out: ${error}`);
        }
        
    };

    showModal(){
        const {showError}=this.props;
        if(!clientId){
            showError('Missing environment variable GOOGLE_CLIENT_ID');
            return;
        }
        this.setState({showing: true});
    };

    hideModal(){
        this.setState({showing: false});
    };

    async onSuccess(res) {
        this.hideModal();
        const {showError}=this.props;
        const googleToken=res.tokenObj.id_token;
        //const givenName=res.profileObj.name;
        //this.setState({user: {signedIn: true,givenName }});
        console.log(res);
        try {
            const apiEndpoint=window.ENV.UI_AUTH_ENDPOINT;
            const response=await fetch(`${apiEndpoint}/signin`,{
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({google_token: googleToken}),
            });
            const body=await response.text();
            const result=JSON.parse(body);
            const {signedIn, givenName}=result;
            console.log(result);
            this.setState({user:{signedIn,givenName}});
        } catch(error) {
            showError(`Error signin into the app: ${error}`);
        }
    };
    onFailure(res){
        console.log("Google Log in was unsuccessful. Try again later", res)
    };

    async signIn(){
        { return useGoogleLogin({
            onSuccess: this.onSuccess,
            onFailure: this.onFailure,
            clientId,
            isSignedIn: true,
            accessType: 'offline',
            // responseType: 'code',
            // prompt: 'consent',
          });}
    }

    render(){
        const {user}=this.state;
        if(user.signedIn){
            return(
                <NavDropdown title={user.givenName} id="user">
                    <MenuItem>
                        <GoogleLogout
                            clientId={clientId}
                            buttonText="Logout"
                            onLogoutSuccess={this.signOut}
                        ></GoogleLogout>
                    </MenuItem>
                </NavDropdown>
            );
        }

        const {showing,disabled}=this.state;
        return(
            <>
                <NavItem onClick={this.showModal}>
                    Sign in
                </NavItem>
                <Modal keyboard show={showing} onHide={this.hideModal} bsSize="sm">
                    <Modal.Header closeButton>
                        <Modal.Title>Sign in</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                       <button onClick={this.signIn} className="button">
                            <img src="icons/google.svg" alt="google login" className="icon"></img>
                            <span className="buttonText">Sign in with Google</span>
                        </button>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button bsStyle="link" onClick={this.hideModal}>Cancel</Button>
                    </Modal.Footer>
                </Modal>
            </>
        )
    }
}

export default withToast(GoogleSignInNavItem);