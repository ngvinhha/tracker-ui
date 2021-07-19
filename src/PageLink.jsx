import React from 'react';
import {LinkContainer} from 'react-router-bootstrap'

export default function PageLink({params,page,activePage,children}){
    params.set('page',page);
    if(page===0) return React.cloneElement(children,{disabled: true});
    return (
        <LinkContainer
            isActive={()=>page===activePage}
            to={{search: `${params.toString()}`}}
        >
            {children}
        </LinkContainer>
    )
}