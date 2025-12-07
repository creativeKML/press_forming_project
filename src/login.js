import React, { useEffect, useMemo, useRef, useState } from "react";
import './login.css'
import { useNavigate } from "react-router-dom";

export default function LoginModule() {
    const [activeTab, setActiveTab] = useState('login');
    const [showTerms, setShowTerms] = useState(false);
    const [showRecovery, setShowRecovery] = useState(false);
    const [recoveryAnimating, setRecoveryAnimating] = useState(false);
    const [slideIndex, setSlideIndex] = useState(0);

    const slides = useMemo(
        () => [
            { key: 'one', title: '소성가공 품질', text: '소성가공 품질보증 대시보드' },
            { key: 'two', title: '소성가공 품질', text: '소성가공 품질보증 대시보드' },
            { key: 'three', title: '소성가공 품질', text: '소성가공 품질보증 대시보드' },
            { key: 'four', title: '소성가공 품질', text: '소성가공 품질보증 대시보드' },
        ],
        []
    );

    // Slideshow interval
    useEffect(() => {
        const id = setInterval(() => {
            setSlideIndex((prev) => (prev + 1) % slides.length);
        }, 3850);
        return () => clearInterval(id);
    }, [slides.length]);

    // Derived arrow state (true if any overlay panel open)
    const arrowActive = showTerms || showRecovery;

    // Handlers
    //   const handleTabClick = (tab: 'login' | 'signup') => (e) => {
    //     e.preventDefault();
    //     setActiveTab(tab);
    //   };

    const openTerms = (e) => {
        e?.preventDefault();
        // If user clicked from Login tab button in the original code while terms is closed, it would early-return.
        setShowRecovery(false);
        setShowTerms(true);
    };
    const closeTerms = (e) => {
        e?.preventDefault();
        setShowTerms(false);
    };
    const toggleTerms = (e) => {
        e?.preventDefault();
        if (showTerms) closeTerms();
        else openTerms();
    };

    const navigate = useNavigate();


    const openRecovery = (e) => {
        e?.preventDefault();
        setShowTerms(false);
        setShowRecovery(true);
    };
    const closeRecovery = (e) => {
        e?.preventDefault();
        setShowRecovery(false);
    };

    const onRecoverySubmit = (e) => {
        e.preventDefault();
        setRecoveryAnimating(true);
        // mimic original 2.5s feedback before closing the panel
        setTimeout(() => {
            setRecoveryAnimating(false);
            setShowRecovery(false);
        }, 2500);
    };

    const preventSubmit = (e) => {
        e.preventDefault();
    };

    return (
        <div className="login">
            <div className="wrap">
                {/* TOGGLE */}
                <div id="toggle-wrap" className={showTerms || showRecovery ? '' : 'closed'}>
                    <div
                        id="toggle-terms"
                        className={showTerms || showRecovery ? 'open' : 'closed'}
                        onClick={toggleTerms}
                        role="button"
                        aria-label="Toggle terms"
                    >
                        <div id="cross">
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>

                {/* TERMS */}
                <div className={`terms ${showTerms ? 'open' : 'closed'}`} aria-hidden={!showTerms}>
                    <h2>dp Terms of Service</h2>
                    <p className="small">Last modified: September 23, 2017</p>
                    <h3>Welcome to dp</h3>
                    <p>By using our Services, you are agreeing to these terms. Please read them carefully.</p>
                    <p>Our Services are very diverse, so sometimes additional terms or product requirements (including age requirements) may apply. Additional terms will be available with the relevant Services, and those additional terms become part of your agreement with us if you use those Services.</p>
                    <h3>Using our Services</h3>
                    <p>You must follow any policies made available to you within the Services.</p>
                    <p>Using our Services does not give you ownership of any intellectual property rights in our Services or the content you access. You may not use content from our Services unless you obtain permission from its owner or are otherwise permitted by law. These terms do not grant you the right to use any branding or logos used in our Services. Don’t remove, obscure, or alter any legal notices displayed in or along with our Services.</p>
                    <p>In connection with your use of the Services, we may send you service announcements, administrative messages, and other information. You may opt out of some of those communications.</p>
                    <h3>Your dp Account</h3>
                    <p>You may need a dp Account in order to use some of our Services. You may create your own dp Account, or your dp Account may be assigned to you by an administrator, such as your employer or educational institution. If you are using a dp Account assigned to you by an administrator, different or additional terms may apply and your administrator may be able to access or disable your account.</p>
                    <p>To protect your dp Account, keep your password confidential. You are responsible for the activity that happens on or through your dp Account. Try not to reuse your dp Account password on third-party applications.</p>
                    <h3>Privacy and Copyright Protection</h3>
                    <p>dp’s privacy policies explain how we treat your personal data and protect your privacy when you use our Services. By using our Services, you agree that dp can use such data in accordance with our privacy policies.</p>
                    <p>We respond to notices of alleged copyright infringement and terminate accounts of repeat infringers according to the process set out in the U.S. Digital Millennium Copyright Act.</p>
                    <p>We provide information to help copyright holders manage their intellectual property online. If you think somebody is violating your copyrights and want to notify us, you can find information about submitting notices and dp’s policy about responding to notices in our Help Center.</p>
                    <h3>Modifying and Terminating our Services</h3>
                    <p>We are constantly changing and improving our Services. We may add or remove functionalities or features, and we may suspend or stop a Service altogether.</p>
                    <p>You can stop using our Services at any time, although we’ll be sorry to see you go. dp may also stop providing Services to you, or add or create new limits to our Services at any time.</p>
                    <p>We believe that you own your data and preserving your access to such data is important. If we discontinue a Service, where reasonably possible, we will give you reasonable advance notice and a chance to get information out of that Service.</p>
                    <h3>Our Warranties and Disclaimers</h3>
                    <p>We provide our Services using a commercially reasonable level of skill and care and we hope that you will enjoy using them. But there are certain things that we don’t promise about our Services.</p>
                    <p>OTHER THAN AS EXPRESSLY SET OUT IN THESE TERMS OR ADDITIONAL TERMS, NEITHER dp NOR ITS SUPPLIERS OR DISTRIBUTORS MAKE ANY SPECIFIC PROMISES ABOUT THE SERVICES. FOR EXAMPLE, WE DON’T MAKE ANY COMMITMENTS ABOUT THE CONTENT WITHIN THE SERVICES, THE SPECIFIC FUNCTIONS OF THE SERVICES, OR THEIR RELIABILITY, AVAILABILITY, OR ABILITY TO MEET YOUR NEEDS. WE PROVIDE THE SERVICES “AS IS”.</p>
                    <p>SOME JURISDICTIONS PROVIDE FOR CERTAIN WARRANTIES, LIKE THE IMPLIED WARRANTY OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. TO THE EXTENT PERMITTED BY LAW, WE EXCLUDE ALL WARRANTIES.</p>
                    <h3>Liability for our Services</h3>
                    <p>WHEN PERMITTED BY LAW, dp, AND dp’S SUPPLIERS AND DISTRIBUTORS, WILL NOT BE RESPONSIBLE FOR LOST PROFITS, REVENUES, OR DATA, FINANCIAL LOSSES OR INDIRECT, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES.</p>
                    <p>TO THE EXTENT PERMITTED BY LAW, THE TOTAL LIABILITY OF dp’S, AND ITS SUPPLIERS AND DISTRIBUTORS, FOR ANY CLAIMS UNDER THESE TERMS, INCLUDING FOR ANY IMPLIED WARRANTIES, IS LIMITED TO THE AMOUNT YOU PAID US TO USE THE SERVICES (OR, IF WE CHOOSE, TO SUPPLYING YOU THE SERVICES AGAIN).</p>
                    <p>IN ALL CASES, dp, AND ITS SUPPLIERS AND DISTRIBUTORS, WILL NOT BE LIABLE FOR ANY LOSS OR DAMAGE THAT IS NOT REASONABLY FORESEEABLE.</p>
                    <h3>About these Terms</h3>
                    <p>We may modify these terms or any additional terms that apply to a Service to, for example, reflect changes to the law or changes to our Services. You should look at the terms regularly. We’ll post notice of modifications to these terms on this page. We’ll post notice of modified additional terms in the applicable Service. Changes will not apply retroactively and will become effective no sooner than fourteen days after they are posted. However, changes addressing new functions for a Service or changes made for legal reasons will be effective immediately. If you do not agree to the modified terms for a Service, you should discontinue your use of that Service.</p>
                    <p>If you do not comply with these terms, and we don’t take action right away, this doesn’t mean that we are giving up any rights that we may have (such as taking action in the future).</p>
                    <p>The laws of California, U.S.A., excluding California’s conflict of laws rules, will apply to any disputes arising out of or relating to these terms or the Services. All claims arising out of or relating to these terms or the Services will be litigated exclusively in the federal or state courts of Santa Clara County, California, USA, and you and dp consent to personal jurisdiction in those courts.</p>
                    <p>For information about how to contact dp, please visit our contact page.</p>
                    <div className="actions" style={{ textAlign: 'right' }}>
                        <a href="#" onClick={closeTerms} className="button" style={{ position: 'static' }}>Close</a>
                    </div>
                </div>

                {/* RECOVERY */}
                <div className={`recovery ${showRecovery ? 'open' : 'closed'}`} aria-hidden={!showRecovery}>
                    <h2>Password Recovery</h2>
                    <p>
                        Enter either the <strong>email address</strong> or <strong>username</strong> on the account and{' '}
                        <strong>click Submit</strong>
                    </p>
                    <p>We'll email instructions on how to reset your password.</p>
                    <form className="recovery-form" action="" method="post" onSubmit={onRecoverySubmit}>
                        <input type="text" className="input" id="user_recover" placeholder="Enter Email or Username Here" />
                        <input type="submit" className="button" value="Submit" />
                    </form>
                    <p className={`mssg ${recoveryAnimating ? 'animate' : ''}`}>An email has been sent to you with further instructions.</p>
                    <div className="actions" style={{ textAlign: 'right' }}>
                        <a href="#" onClick={closeRecovery} className="button" style={{ position: 'static' }}>Close</a>
                    </div>
                </div>

                {/* SLIDER */}
                <div className="content">
                    {/* LOGO */}
                    <div className="logo">
                        <a href="#" aria-label="dp home">
                            {/* Placeholder square if image fails */}
                            <img src="http://res.cloudinary.com/dpcloudinary/image/upload/v1506186248/logo.png" alt="dp logo" />
                        </a>
                    </div>
                    {/* SLIDESHOW */}
                    <div id="slideshow">
                        {slides.map((s, i) => (
                            <div key={s.key} className={`${s.key}`} style={{ display: i === slideIndex ? 'block' : 'none' }}>
                                <h2>
                                    <span>{s.title}</span>
                                </h2>
                                <p>{s.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* LOGIN FORM */}
                <div className="user">
                    <div className="form-wrap">
                        {/* TABS */}
                        <div className="tabs">
                            <h3 className="login-tab">
                                <a className={`log-in ${activeTab === 'login' ? 'active' : ''}`} href="#login-tab-content">
                                    <span>Login</span>
                                </a>
                            </h3>
                            <h3 className="signup-tab">
                                <a className={`sign-up ${activeTab === 'signup' ? 'active' : ''}`} href="#signup-tab-content">
                                    <span>Sign Up</span>
                                </a>
                            </h3>
                        </div>

                        {/* TABS CONTENT */}
                        <div className="tabs-content">
                            {/* Simple arrow substitute */}
                            <span className={`fa ${arrowActive ? 'active' : 'inactive'}`} aria-hidden="true">←</span>

                            {/* LOGIN TAB CONTENT */}
                            <div id="login-tab-content" className={activeTab === 'login' ? 'active' : ''}>
                                <form className="login-form" action="" method="post">
                                    <input type="text" className="input" id="user_login" autoComplete="off" placeholder="Email or Username" />
                                    <input type="password" className="input" id="user_pass" autoComplete="off" placeholder="Password" />
                                    <input type="checkbox" className="checkbox" defaultChecked id="remember_me" />
                                    <label htmlFor="remember_me">Remember me</label>
                                    <input type="submit" className="button" value="Login" onClick={(e) => {
                                        e.preventDefault();
                                        localStorage.setItem("auth", "1"); // 로그인 플래그 저장
                                        navigate("/dashboard"); // 로그인 성공 후 대시보드로 이동
                                    }}/>
                                </form>
                                <div className="help-action">
                                    <p>
                                        <span className="fa" aria-hidden="true">←</span>
                                        <a className="forgot" href="#" onClick={openRecovery}>Forgot your password?</a>
                                    </p>
                                </div>
                            </div>

                            {/* SIGNUP TAB CONTENT */}
                            <div id="signup-tab-content" className={activeTab === 'signup' ? 'active' : ''}>
                                <form className="signup-form" action="" method="post" onSubmit={preventSubmit}>
                                    <input type="email" className="input" id="user_email" autoComplete="off" placeholder="Email" />
                                    <input type="text" className="input" id="user_name" autoComplete="off" placeholder="Username" />
                                    <input type="password" className="input" id="user_pass_signup" autoComplete="off" placeholder="Password" />
                                    <input type="submit" className="button" value="Sign Up" />
                                </form>
                                <div className="help-action">
                                    <p>By signing up, you agree to our</p>
                                    <p>
                                        <span className="fa" aria-hidden="true">←</span>
                                        <a className="agree" href="#" onClick={openTerms}>Terms of service</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

