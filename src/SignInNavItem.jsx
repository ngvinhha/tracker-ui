import React from 'react';
import {
    NavItem, Modal, Button, NavDropdown, MenuItem
} from 'react-bootstrap';
import withToast from './withToast.jsx';
import {GoogleLogin, GoogleLogout} from 'react-google-login';

const clientId='1038127560252-l5to72bpo8p6pb4f2mieeljlkjpkgfte.apps.googleusercontent.com';

class SignInNavItem extends React.Component {
    constructor(props){
        super(props);
        this.state={
            showing: false,
        }
        this.showModal=this.showModal.bind(this);
        this.hideModal=this.hideModal.bind(this);
        this.signIn=this.signIn.bind(this);
        this.signOut=this.signOut.bind(this);
        this.onGoogleFailure=this.onGoogleFailure.bind(this);
    }

    async signIn(res) {
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
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({google_token: googleToken}),
            });
            const body=await response.text();
            const result=JSON.parse(body);
            const {signedIn, givenName}=result;
            console.log(result);
            const {onUserChange}=this.props;
            onUserChange({signedIn,givenName});
        } catch(error) {
            showError(`Error signin into the app: ${error}`);
        }
    };
    onGoogleFailure(res){
        console.log("Google Log in/Log out was unsuccessful. Try again later", res)
    };

    async signOut(){
        const apiEndpoint=window.ENV.UI_AUTH_ENDPOINT;
        const {showError}=this.props;
        try{
            await fetch(`${apiEndpoint}/signout`,{
                method: 'POST',
                credentials: 'include',
            });
            const {onUserChange}=this.props;
            onUserChange({signedIn: false, givenName: ''});
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

    render(){
        const {user}=this.props;
        if(user.signedIn){
            return(
                <NavDropdown title={user.givenName} id="user">
                    <MenuItem>
                        <GoogleLogout
                            clientId={clientId}
                            buttonText="Logout"
                            onLogoutSuccess={this.signOut}
                            onLogoutFailure={this.onGoogleFailure}
                        ></GoogleLogout>
                    </MenuItem>
                </NavDropdown>
            );
        }
        const {showing}=this.state;
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
                        <GoogleLogin
                            clientId={clientId}
                            render={renderProps=>(
                                <Button 
                                  onClick={renderProps.onClick}
                                  disabled={renderProps.disabled}
                                  bsStyle="primary"
                                >
                                    <img src="images/btn_google_signin_light_normal_web.png" alt="google login" className="icon"></img>
                                </Button>
                              )}
                            onSuccess={this.signIn}
                            onFailure={this.onGoogleFailure}
                            cookiePolicy={'single_host_origin'}
                            style={{marginTop: '100px'}}
                            isSignedIn={true}
                        />
                    </Modal.Body>
                    <Modal.Footer>
                        <Button bsStyle="link" onClick={this.hideModal}>Cancel</Button>
                    </Modal.Footer>
                </Modal>
            </>
        )
    }
}

export default withToast(SignInNavItem);